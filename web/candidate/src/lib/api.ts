import { auth } from "@/lib/firebase";

type RankedJobApiItem = {
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
  breakdown: {
    skillOverlap: number;
    projectOverlap: number;
    experienceOverlap: number;
    titleAlignment: number;
    educationRelevance: number;
    preferenceFit: number;
    recencyBoost: number;
  };
};

async function getIdToken() {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  return await u.getIdToken();
}

export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await getIdToken();
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}

export async function generateTailoredLatex(args: {
  jobId: string;
  matchScore?: number;
  matchReasons?: string[];
}) {
  const res = await authedFetch("/api/resume/generate-latex", {
    method: "POST",
    body: JSON.stringify(args),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json as { ok: true; applicationId: string; genId: string };
}

export async function downloadResumePdf(applicationId: string) {
  const res = await authedFetch(`/api/resume/pdf?applicationId=${encodeURIComponent(applicationId)}`);
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.error || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "resume.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function getRankedJobsFeed(take = 150) {
  const res = await authedFetch(`/api/match/feed?take=${encodeURIComponent(String(take))}`);
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json as {
    ok: true;
    jobs: RankedJobApiItem[];
    meta: { total: number; hasProfile: boolean; usedRecommendations: boolean };
  };
}

export async function refreshAiMatchScores(jobIds: string[]) {
  const res = await authedFetch("/api/match/refresh", {
    method: "POST",
    body: JSON.stringify({ jobIds }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json as { ok: true; results: Array<{ jobId: string; score: number; reasons: string[]; localScore: number }> };
}
