import type { JobDoc, MasterProfileDoc } from "./types";

/**
 * Lightweight client-side scoring (hackathon-safe fallback).
 * Real system should compute scores in a worker and write /users/{uid}/recommendations.
 */
export function computeMatch(job: JobDoc, profile: MasterProfileDoc | null | undefined): { score: number; reasons: string[] } {
  const skills = (profile?.skills ?? []).map((s) => s.toLowerCase());
  const tags = (job.tags ?? []).map((t) => t.toLowerCase());
  const jd = (job.jdText ?? "").toLowerCase();

  if (skills.length === 0) return { score: 50, reasons: ["Complete your profile to improve match"] };

  const matched = skills.filter((s) => tags.includes(s) || jd.includes(s));
  const overlap = matched.length;
  const max = Math.max(6, Math.min(12, skills.length));

  const base = Math.round((overlap / max) * 80);
  const score = Math.max(35, Math.min(98, base + 20));

  const reasons: string[] = [];
  if (matched.length > 0) reasons.push(`Matched skills: ${matched.slice(0, 3).join(", ")}`);
  if (job.jobType) reasons.push(`Job type: ${job.jobType}`);
  if (job.location) reasons.push(`Location: ${job.location}`);

  return { score, reasons: reasons.slice(0, 3) };
}
