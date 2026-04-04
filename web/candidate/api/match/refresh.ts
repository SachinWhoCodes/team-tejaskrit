import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../_lib/firebaseAdmin.js";
import { requireUser } from "../_lib/auth.js";
import { groqChatJson } from "../_lib/groq.js";
import { scoreLocalJob } from "../_lib/matchLocal.js";
import { stripUndefinedDeep } from "../_lib/util.js";

type Body = { jobIds: string[] };

function bad(res: VercelResponse, status: number, msg: string) {
  return res.status(status).json({ ok: false, error: msg });
}

function clip(s: string, n: number) {
  const t = (s ?? "").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function buildCandidateText(user: any, profile: any) {
  const skills = Array.isArray(profile?.skills) ? profile.skills.join(", ") : "";
  const edu = Array.isArray(profile?.education)
    ? profile.education
        .map((e: any) => `${e.degree ?? ""} ${e.branch ?? ""} @ ${e.institute ?? ""} (${e.startYear ?? ""}-${e.endYear ?? ""}) CGPA:${e.cgpa ?? ""}`)
        .join(" | ")
    : "";
  const exp = Array.isArray(profile?.experience)
    ? profile.experience
        .slice(0, 3)
        .map((x: any) => `${x.title ?? ""} @ ${x.company ?? ""}: ${(x.bullets ?? []).slice(0, 3).join("; ")}`)
        .join(" | ")
    : "";
  const projects = Array.isArray(profile?.projects)
    ? profile.projects
        .slice(0, 3)
        .map((p: any) => `${p.name ?? ""} (${(p.tech ?? []).join(", ")}): ${(p.bullets ?? []).slice(0, 3).join("; ")}`)
        .join(" | ")
    : "";

  const masterText = profile?.masterText ? String(profile.masterText) : "";

  return clip(
    [
      `Name: ${user?.name ?? ""}`,
      `Email: ${user?.email ?? ""}`,
      `Headline: ${profile?.headline ?? ""}`,
      `Summary: ${profile?.summary ?? ""}`,
      `Skills: ${skills}`,
      `Education: ${edu}`,
      `Experience: ${exp}`,
      `Projects: ${projects}`,
      masterText ? `MasterText: ${masterText}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    8000
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return bad(res, 405, "Method not allowed");

  try {
    const authed = await requireUser(req);
    const body = (req.body ?? {}) as Body;
    const requestedJobIds = Array.isArray(body.jobIds)
      ? Array.from(new Set(body.jobIds.map((id) => String(id || "").replace(/^\/?jobs\//, "")).filter(Boolean))).slice(0, 8)
      : [];
    if (requestedJobIds.length === 0) return bad(res, 400, "jobIds required (max 8)");

    const db = getAdminDb();

    const userSnap = await db.collection("users").doc(authed.uid).get();
    if (!userSnap.exists) return bad(res, 404, "User not found");
    const user = userSnap.data() || {};

    if (user?.consents?.jobMatching === false) return bad(res, 403, "Job matching disabled");

    const profileSnap = await db.collection("users").doc(authed.uid).collection("master_profile").doc("main").get();
    if (!profileSnap.exists) return bad(res, 400, "Master profile missing");
    const profile = profileSnap.data() || {};

    const jobDocs = await Promise.all(
      requestedJobIds.map(async (id) => {
        const snap = await db.collection("jobs").doc(id).get();
        if (!snap.exists) return null;
        const data = snap.data() || {};
        const local = scoreLocalJob({ user, profile, id, data });
        return {
          jobId: id,
          title: data.title ?? "",
          company: data.company ?? "",
          location: data.location ?? "",
          jobType: data.jobType ?? "",
          tags: Array.isArray(data.tags) ? data.tags.slice(0, 20) : [],
          jdText: clip(String(data.jdText ?? ""), 1500),
          localScore: local.score,
          localReasons: local.reasons,
          profileHash: local.profileHash,
          jobHash: local.jobHash,
        };
      })
    );

    const jobs = jobDocs.filter(Boolean) as any[];
    if (!jobs.length) return bad(res, 404, "No jobs found");

    const candidateText = buildCandidateText(user, profile);
    const system =
      "You are an expert ATS matcher. Refine job relevance for this candidate. " +
      "Respect the local score and only adjust when the evidence is clear. " +
      "Return STRICT JSON only with score 0-100 and 2-4 short reasons per job. " +
      "Do not invent candidate experience.";

    const prompt = `
Candidate:
${candidateText}

Jobs (JSON):
${JSON.stringify(jobs, null, 2)}

Return JSON exactly like:
{
  "results": [
    { "jobId": "...", "score": 0-100, "reasons": ["..", "..", ".."] }
  ]
}
`;

    const out = await groqChatJson({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      maxTokens: 1100,
    });

    const results: Array<{ jobId: string; score: number; reasons: string[] }> = Array.isArray(out?.results) ? out.results : [];
    if (!results.length) return bad(res, 500, "Groq returned empty results");

    const localById = new Map(jobs.map((job) => [job.jobId, job]));
    const now = new Date();
    const batch = db.batch();
    const payloadResults: Array<{ jobId: string; score: number; reasons: string[]; localScore: number }> = [];

    for (const result of results) {
      if (!result?.jobId) continue;
      const local = localById.get(result.jobId);
      if (!local) continue;

      const aiScore = Math.max(0, Math.min(100, Number(result.score ?? 0)));
      const localScore = Math.max(0, Math.min(100, Number(local.localScore ?? 0)));
      const finalScore = Math.round(localScore * 0.6 + aiScore * 0.4);
      const aiReasons = Array.isArray(result.reasons) ? result.reasons.map(String).slice(0, 4) : [];
      const reasons = (aiReasons.length ? aiReasons : local.localReasons).slice(0, 4);

      const recRef = db.collection("users").doc(authed.uid).collection("recommendations").doc(result.jobId);
      batch.set(
        recRef,
        stripUndefinedDeep({
          jobId: result.jobId,
          localScore,
          aiScore,
          finalScore,
          score: finalScore,
          reasons,
          localReasons: local.localReasons,
          aiReasons,
          computedAt: now,
          source: "groq:v2",
          model: "llama-3.1-8b-instant",
          profileHash: local.profileHash,
          jobHash: local.jobHash,
        }),
        { merge: true }
      );

      const appId = `${authed.uid}__${result.jobId}`;
      const appRef = db.collection("applications").doc(appId);
      batch.set(
        appRef,
        stripUndefinedDeep({
          userId: authed.uid,
          instituteId: user?.instituteId ?? null,
          jobId: result.jobId,
          matchScore: finalScore,
          matchReasons: reasons,
          updatedAt: now,
        }),
        { merge: true }
      );

      payloadResults.push({ jobId: result.jobId, score: finalScore, reasons, localScore });
    }

    await batch.commit();
    return res.status(200).json({ ok: true, results: payloadResults });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? "Unknown error" });
  }
}
