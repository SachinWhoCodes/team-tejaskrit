import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../_lib/firebaseAdmin.js";
import { requireUser } from "../_lib/auth.js";
import { rankLocalJobs } from "../_lib/matchLocal.js";

type RankedJobResponse = {
  id: string;
  title: string;
  company: string;
  location?: string;
  jobType?: "Internship" | "Full-time";
  applyUrl?: string;
  description: string;
  skills: string[];
  source: string;
  visibility?: "public" | "institute" | "private";
  instituteId?: string | null;
  ownerUid?: string | null;
  lastSeenAtMs: number;
  localScore: number;
  aiScore?: number;
  finalScore: number;
  reasons: string[];
  localReasons: string[];
  aiReasons?: string[];
  scoreSource: "local" | "groq" | "hybrid";
  profileHash: string;
  jobHash: string;
  breakdown: ReturnType<typeof rankLocalJobs>[number]["local"]["breakdown"];
};

function bad(res: VercelResponse, status: number, msg: string) {
  return res.status(status).json({ ok: false, error: msg });
}

function tsMs(value: any) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?._seconds === "number") return value._seconds * 1000;
  if (value instanceof Date) return value.getTime();
  return 0;
}

async function listJobsForUser(db: any, uid: string, instituteId?: string | null, take = 150) {
  const capped = Math.max(1, Math.min(200, take));
  const [publicSnap, instituteSnap, privateSnap] = await Promise.all([
    db.collection("jobs").where("visibility", "==", "public").limit(capped).get(),
    instituteId ? db.collection("jobs").where("instituteId", "==", instituteId).limit(capped).get() : Promise.resolve(null),
    db.collection("jobs").where("ownerUid", "==", uid).limit(capped).get(),
  ]);

  const map = new Map<string, { id: string; data: Record<string, any> }>();

  for (const doc of publicSnap.docs) {
    map.set(doc.id, { id: doc.id, data: doc.data() });
  }

  if (instituteSnap) {
    for (const doc of instituteSnap.docs) {
      const data = doc.data();
      if (data?.visibility === "institute") map.set(doc.id, { id: doc.id, data });
    }
  }

  for (const doc of privateSnap.docs) {
    const data = doc.data();
    if (data?.visibility === "private") map.set(doc.id, { id: doc.id, data });
  }

  return Array.from(map.values())
    .sort((left, right) => {
      const rightMs = tsMs(right.data?.lastSeenAt) || tsMs(right.data?.postedAt) || tsMs(right.data?.createdAt) || tsMs(right.data?.updatedAt) || 0;
      const leftMs = tsMs(left.data?.lastSeenAt) || tsMs(left.data?.postedAt) || tsMs(left.data?.createdAt) || tsMs(left.data?.updatedAt) || 0;
      return rightMs - leftMs;
    })
    .slice(0, capped);
}

async function listRecommendations(db: any, uid: string, take = 200) {
  const snap = await db.collection("users").doc(uid).collection("recommendations").limit(Math.max(1, Math.min(take, 300))).get();
  const map = new Map<string, Record<string, any>>();

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const jobId = String(data.jobId || doc.id || "").replace(/^\/?jobs\//, "");
    if (!jobId) continue;
    map.set(jobId, data);
  }

  return map;
}

function toResponseItem(item: ReturnType<typeof rankLocalJobs>[number], rec?: Record<string, any>): RankedJobResponse {
  const job = item.data || {};
  const localScore = item.local.score;
  const rawAiScore = Number(rec?.finalScore ?? rec?.aiScore ?? rec?.score);
  const hasAi = Number.isFinite(rawAiScore) && rawAiScore >= 0;
  const aiScore = hasAi ? Math.max(0, Math.min(100, rawAiScore)) : undefined;
  const finalScore = aiScore ?? localScore;
  const aiReasons = Array.isArray(rec?.reasons) ? rec.reasons.map(String).slice(0, 4) : undefined;
  const reasons = (aiReasons?.length ? aiReasons : item.local.reasons).slice(0, 4);
  const scoreSource = aiScore === undefined ? "local" : aiScore === localScore ? "groq" : "hybrid";

  return {
    id: item.id,
    title: String(job.title ?? ""),
    company: String(job.company ?? ""),
    location: job.location ? String(job.location) : undefined,
    jobType: job.jobType,
    applyUrl: job.applyUrl ? String(job.applyUrl) : undefined,
    description: String(job.jdText ?? ""),
    skills: Array.isArray(job.tags) ? job.tags.map(String).slice(0, 20) : [],
    source: String(job.source ?? "scraped"),
    visibility: job.visibility,
    instituteId: job.instituteId ?? null,
    ownerUid: job.ownerUid ?? null,
    lastSeenAtMs: tsMs(job.lastSeenAt) || tsMs(job.postedAt) || tsMs(job.createdAt) || tsMs(job.updatedAt) || 0,
    localScore,
    aiScore,
    finalScore,
    reasons,
    localReasons: item.local.reasons,
    aiReasons,
    scoreSource,
    profileHash: item.local.profileHash,
    jobHash: item.local.jobHash,
    breakdown: item.local.breakdown,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return bad(res, 405, "Method not allowed");

  try {
    const authed = await requireUser(req);
    const take = Number(req.query.take ?? 150);
    const db = getAdminDb();

    const userSnap = await db.collection("users").doc(authed.uid).get();
    if (!userSnap.exists) return bad(res, 404, "User not found");
    const user = userSnap.data() || {};

    const profileSnap = await db.collection("users").doc(authed.uid).collection("master_profile").doc("main").get();
    const profile = profileSnap.exists ? profileSnap.data() || {} : {};

    const [jobs, recs] = await Promise.all([
      listJobsForUser(db, authed.uid, user?.instituteId ?? null, take),
      listRecommendations(db, authed.uid, take * 2),
    ]);

    const ranked = rankLocalJobs({ user, profile, jobs });
      
    const items = ranked.map((item) => toResponseItem(item, recs.get(item.id)));
    items.sort((left, right) => {
      if (right.finalScore !== left.finalScore) return right.finalScore - left.finalScore;
      return right.lastSeenAtMs - left.lastSeenAtMs;
    });

    return res.status(200).json({
      ok: true,
      jobs: items.slice(0, Math.max(1, Math.min(take, 200))),
      meta: {
        total: items.length,
        hasProfile: profileSnap.exists,
        usedRecommendations: items.some((item) => item.aiScore !== undefined),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error?.message ?? "Unknown error" });
  }
}
