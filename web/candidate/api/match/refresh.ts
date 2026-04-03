import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../_lib/firebaseAdmin.js";
import { requireUser } from "../_lib/auth.js";
import { groqChatJson } from "../_lib/groq.js";
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
    ].filter(Boolean).join("\n"),
    8000
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return bad(res, 405, "Method not allowed");

  try {
    const authed = await requireUser(req);
    const body = (req.body ?? {}) as Body;
    const jobIds = Array.isArray(body.jobIds) ? body.jobIds.filter(Boolean).slice(0, 12) : [];
    if (jobIds.length === 0) return bad(res, 400, "jobIds required (max 12)");

    const db = getAdminDb();

    // user + profile
    const userSnap = await db.collection("users").doc(authed.uid).get();
    if (!userSnap.exists) return bad(res, 404, "User not found");
    const user = userSnap.data() || {};

    if (user?.consents?.jobMatching === false) return bad(res, 403, "Job matching disabled");

    const profileSnap = await db.collection("users").doc(authed.uid).collection("master_profile").doc("main").get();
    if (!profileSnap.exists) return bad(res, 400, "Master profile missing");
    const profile = profileSnap.data() || {};

    const candidateText = buildCandidateText(user, profile);

    // job docs
    const jobDocs = await Promise.all(
      jobIds.map(async (id) => {
        const snap = await db.collection("jobs").doc(id).get();
        if (!snap.exists) return null;
        const j = snap.data() || {};
        return {
          jobId: id,
          title: j.title ?? "",
          company: j.company ?? "",
          location: j.location ?? "",
          jobType: j.jobType ?? "",
          tags: Array.isArray(j.tags) ? j.tags.slice(0, 20) : [],
          jdText: clip(String(j.jdText ?? ""), 2000),
        };
      })
    );

    const jobs = jobDocs.filter(Boolean) as any[];
    if (!jobs.length) return bad(res, 404, "No jobs found");

    const system =
      "You are an expert ATS matcher. Score candidate vs each job. " +
      "Return STRICT JSON only. Provide score 0-100 and 3-5 short reasons per job. " +
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
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      maxTokens: 1800,
    });

    const results: Array<{ jobId: string; score: number; reasons: string[] }> = Array.isArray(out?.results) ? out.results : [];
    if (!results.length) return bad(res, 500, "Groq returned empty results");

    const now = new Date();

    // write /users/{uid}/recommendations/{jobId}
    const batch = db.batch();
    for (const r of results) {
      if (!r?.jobId) continue;
      const score = Math.max(0, Math.min(100, Number(r.score ?? 0)));
      const reasons = Array.isArray(r.reasons) ? r.reasons.map(String).slice(0, 6) : [];

      const recRef = db.collection("users").doc(authed.uid).collection("recommendations").doc(r.jobId);
      batch.set(
        recRef,
        stripUndefinedDeep({
          jobId: r.jobId,
          score,
          reasons,
          computedAt: now,
          source: "groq:v1",
        }),
        { merge: true }
      );

      // OPTIONAL: if application exists, also update matchScore/matchReasons so tracker uses same
      const appId = `${authed.uid}__${r.jobId}`;
      const appRef = db.collection("applications").doc(appId);
      batch.set(
        appRef,
        stripUndefinedDeep({
          userId: authed.uid,
          instituteId: user?.instituteId ?? null,
          jobId: r.jobId,
          matchScore: score,
          matchReasons: reasons,
          updatedAt: now,
        }),
        { merge: true }
      );
    }
    await batch.commit();

    return res.status(200).json({ ok: true, results });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? "Unknown error" });
  }
}