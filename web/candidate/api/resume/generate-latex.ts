import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../_lib/firebaseAdmin.js";
import { requireUser } from "../_lib/auth.js";
import { stripUndefinedDeep } from "../_lib/util.js";
import { groqChat } from "../_lib/groq.js";

type Body = {
  jobId: string;
  // optional: let client pass match for display
  matchScore?: number;
  matchReasons?: string[];
};

function bad(res: VercelResponse, status: number, msg: string) {
  return res.status(status).json({ ok: false, error: msg });
}

function cleanLatex(out: string) {
  // Remove code fences if model accidentally returns them.
  const s = out.trim();
  const fenced = s.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "");
  return fenced.trim();
}

function ensureLatexLooksValid(tex: string) {
  const t = tex.trim();
  if (!t.includes("\\documentclass")) throw new Error("Invalid LaTeX: missing \\documentclass");
  if (!t.includes("\\begin{document}")) throw new Error("Invalid LaTeX: missing \\begin{document}");
  if (!t.includes("\\end{document}")) throw new Error("Invalid LaTeX: missing \\end{document}");
}

function buildPrompt(args: {
  user: any;
  profile: any;
  job: any;
}) {
  const { user, profile, job } = args;

  const system =
    "You are an expert resume writer. Output ONLY valid LaTeX (no markdown, no backticks). " +
    "Make it ATS-friendly, clean, 1 page, and tailored to the job description. " +
    "Use ONLY pdflatex-compatible packages (no fontspec/xetex). " +
    "Use this structure: Header (Name, Email, Phone, Links) then Summary, Skills, Experience, Projects, Education, Achievements. " +
    "Use compact bullet points, quantify impact, and only include relevant items. " +
    "Do not invent facts. If something is missing, omit it. " +
    "Avoid tables. Keep margins tight using geometry. Use enumitem for spacing.";

  const candidate = {
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    links: profile?.links || {},
    headline: profile?.headline || "",
    summary: profile?.summary || "",
    skills: profile?.skills || [],
    education: profile?.education || [],
    experience: profile?.experience || [],
    projects: profile?.projects || [],
    achievements: profile?.achievements || [],
  };

  const jobInfo = {
    title: job?.title || "",
    company: job?.company || "",
    location: job?.location || "",
    jobType: job?.jobType || "",
    tags: job?.tags || [],
    description: job?.jdText || "",
  };

  const userMsg =
    "Create a tailored one-page resume in LaTeX for the following candidate and job.\n" +
    "Candidate JSON:\n" +
    JSON.stringify(candidate, null, 2) +
    "\n\nJob JSON:\n" +
    JSON.stringify(jobInfo, null, 2) +
    "\n\nRequirements:\n" +
    "- Output ONLY LaTeX.\n" +
    "- Use pdflatex packages only.\n" +
    "- Use: \\documentclass[11pt]{article}, geometry, hyperref, enumitem, xcolor.\n" +
    "- Use small spacing (\\setlist{noitemsep, topsep=0pt}).\n" +
    "- Keep to one page.\n" +
    "- Do NOT add references section.\n";

  return { system, user: userMsg };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return bad(res, 405, "Method not allowed");

  try {
    const authed = await requireUser(req);
    const body = (req.body ?? {}) as Body;
    const jobId = (body.jobId ?? "").trim();
    if (!jobId) return bad(res, 400, "jobId is required");

    const db = getAdminDb();

    // Fetch user + consents
    const userRef = db.collection("users").doc(authed.uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return bad(res, 404, "User doc not found");
    const user = userSnap.data() || {};
    if (user?.consents?.resumeGeneration === false) {
      return bad(res, 403, "Resume generation is disabled in Data & Privacy");
    }

    // Fetch master profile
    const profileRef = db.collection("users").doc(authed.uid).collection("master_profile").doc("main");
    const profileSnap = await profileRef.get();
    const profile = profileSnap.exists ? profileSnap.data() : null;
    if (!profile) return bad(res, 400, "Master profile not found. Complete onboarding first.");

    // Fetch job
    const jobRef = db.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return bad(res, 404, "Job not found");
    const job = jobSnap.data() || {};

    // Call Groq
    const prompt = buildPrompt({ user, profile, job });
    const raw = await groqChat({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 0.2,
      maxTokens: 2200,
    });

    const latex = cleanLatex(raw);
    ensureLatexLooksValid(latex);

    // Upsert application
    const applicationId = `${authed.uid}__${jobId}`;
    const appRef = db.collection("applications").doc(applicationId);
    const appSnap = await appRef.get();

    const now = new Date();
    const instituteId = user?.instituteId ?? null;

    const updateBase: any = {
      userId: authed.uid,
      instituteId,
      jobId,
      status: "tailored",
      updatedAt: now,
      matchScore: typeof body.matchScore === "number" ? body.matchScore : null,
      matchReasons: Array.isArray(body.matchReasons) ? body.matchReasons : [],
      tailoredResume: {
        latex,
        generatedAt: now,
      },
    };

    if (!appSnap.exists) {
      await appRef.set(stripUndefinedDeep({ ...updateBase, createdAt: now, appliedAt: null }), { merge: true });
    } else {
      await appRef.set(stripUndefinedDeep(updateBase), { merge: true });
    }

    // Create generation record
    const genRef = await db.collection("resume_generations").add(
      stripUndefinedDeep({
        userId: authed.uid,
        jobId,
        applicationId,
        model: "llama-3.3-70b-versatile",
        promptVersion: "v1",
        status: "success",
        output: { latex },
        createdAt: now,
        durationMs: null,
      })
    );

    // Link genId on application
    await appRef.set(
      stripUndefinedDeep({
        tailoredResume: {
          latex,
          generatedAt: now,
          genId: genRef.id,
        },
      }),
      { merge: true }
    );

    // Log
    await appRef.collection("logs").add({
      action: "resume_generated",
      meta: { genId: genRef.id, model: "llama-3.3-70b-versatile" },
      at: now,
      by: authed.uid,
    });

    return res.status(200).json({ ok: true, applicationId, genId: genRef.id });
  } catch (e: any) {
    const msg = e?.message ?? "Unknown error";
    return res.status(500).json({ ok: false, error: msg });
  }
}
