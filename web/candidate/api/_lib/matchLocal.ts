import crypto from "crypto";

type AnyObject = Record<string, any>;

type CandidateInput = { user?: AnyObject | null; profile?: AnyObject | null };
type JobInput = { id: string; data: AnyObject };

export type LocalMatchResult = {
  score: number;
  reasons: string[];
  matchedSkills: string[];
  breakdown: {
    skillOverlap: number;
    projectOverlap: number;
    experienceOverlap: number;
    titleAlignment: number;
    educationRelevance: number;
    preferenceFit: number;
    recencyBoost: number;
  };
  profileHash: string;
  jobHash: string;
};

const STOPWORDS = new Set([
  "the",
  "and",
  "with",
  "for",
  "you",
  "your",
  "from",
  "that",
  "this",
  "will",
  "have",
  "has",
  "are",
  "our",
  "job",
  "role",
  "work",
  "team",
  "using",
  "use",
  "into",
  "across",
  "their",
  "them",
  "than",
  "all",
  "any",
  "but",
  "not",
  "can",
  "able",
  "years",
  "year",
  "developer",
  "engineer",
  "intern",
  "full",
  "time",
  "part",
  "remote",
  "onsite",
  "hybrid",
  "apply",
  "location",
  "company",
  "candidate",
  "required",
  "preferred",
  "opportunity",
  "experience",
  "skills",
  "skill",
  "good",
  "strong",
  "knowledge",
]);

function clip01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9+#./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhrase(value: unknown) {
  return normalizeText(value).replace(/[./]/g, " ").trim();
}

function tokenize(value: unknown) {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((value) => normalizePhrase(value))
        .filter(Boolean)
    )
  );
}

function tsMs(value: any) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?._seconds === "number") return value._seconds * 1000;
  if (value instanceof Date) return value.getTime();
  return 0;
}

function hashFromObject(value: unknown) {
  return crypto.createHash("sha1").update(JSON.stringify(value ?? null)).digest("hex");
}

function overlapRatio(left: string[], rightSet: Set<string>) {
  if (!left.length || !rightSet.size) return 0;
  const matched = left.filter((item) => rightSet.has(item));
  return clip01(matched.length / Math.max(1, Math.min(8, left.length)));
}

function buildCandidateProfile(input: CandidateInput) {
  const user = input.user ?? {};
  const profile = input.profile ?? {};

  const rawSkills = uniqueStrings(profile.skills ?? []);
  const projectTech = uniqueStrings((profile.projects ?? []).flatMap((project: AnyObject) => project?.tech ?? []));
  const titleTokens = uniqueStrings([
    profile.headline,
    ...(profile.experience ?? []).map((exp: AnyObject) => exp?.title),
  ]).flatMap((value) => tokenize(value));

  const educationTerms = uniqueStrings([
    ...(profile.education ?? []).flatMap((edu: AnyObject) => [edu?.degree, edu?.branch, edu?.institute]),
  ]);

  const preferenceLocations = uniqueStrings(user?.prefs?.locations ?? []);
  const preferenceJobTypes = uniqueStrings(user?.prefs?.jobTypes ?? []);
  const preferenceDomains = uniqueStrings(user?.prefs?.domains ?? []);

  const resumeBlocks = [
    profile.headline,
    profile.summary,
    profile.masterText,
    ...(profile.achievements ?? []),
    ...(profile.skills ?? []),
    ...(profile.education ?? []).flatMap((edu: AnyObject) => [edu?.degree, edu?.branch, edu?.institute]),
    ...(profile.experience ?? []).flatMap((exp: AnyObject) => [exp?.title, exp?.company, ...(exp?.bullets ?? [])]),
    ...(profile.projects ?? []).flatMap((project: AnyObject) => [project?.name, ...(project?.tech ?? []), ...(project?.bullets ?? [])]),
  ];

  const corpusText = resumeBlocks.filter(Boolean).join(" \n ");
  const corpusTokens = tokenize(corpusText);
  const corpusSet = new Set(corpusTokens);

  return {
    rawSkills,
    projectTech,
    titleTokens,
    educationTerms,
    preferenceLocations,
    preferenceJobTypes,
    preferenceDomains,
    corpusText: normalizeText(corpusText),
    corpusSet,
    profileHash: hashFromObject({
      rawSkills,
      projectTech,
      titleTokens,
      educationTerms,
      preferenceLocations,
      preferenceJobTypes,
      preferenceDomains,
      headline: profile.headline ?? "",
      summary: profile.summary ?? "",
      masterText: profile.masterText ?? "",
      experience: profile.experience ?? [],
      projects: profile.projects ?? [],
    }),
  };
}

function buildJobProfile(input: JobInput) {
  const job = input.data ?? {};
  const title = normalizeText(job.title);
  const company = normalizeText(job.company);
  const location = normalizeText(job.location);
  const jobType = normalizePhrase(job.jobType);
  const jdText = normalizeText(job.jdText);
  const tags = uniqueStrings(job.tags ?? []);

  const roleTokens = tokenize(job.title);
  const keywordTokens = Array.from(new Set([...tokenize(job.title), ...tokenize(job.jdText), ...tokenize(job.company)])).slice(0, 40);

  const skillCorpus = `${tags.join(" ")} ${jdText}`;

  return {
    title,
    company,
    location,
    jobType,
    jdText,
    tags,
    roleTokens,
    keywordTokens,
    skillCorpus,
    recencyMs: tsMs(job.lastSeenAt) || tsMs(job.postedAt) || tsMs(job.createdAt) || tsMs(job.updatedAt) || 0,
    jobHash: hashFromObject({
      id: input.id,
      title: job.title ?? "",
      company: job.company ?? "",
      location: job.location ?? "",
      jobType: job.jobType ?? "",
      tags,
      jdText: jdText.slice(0, 2500),
      updatedAt: tsMs(job.updatedAt),
      lastSeenAt: tsMs(job.lastSeenAt),
      postedAt: tsMs(job.postedAt),
    }),
  };
}

export function scoreLocalJob(input: CandidateInput & JobInput): LocalMatchResult {
  const candidate = buildCandidateProfile(input);
  const job = buildJobProfile(input);

  if (!candidate.rawSkills.length && !candidate.projectTech.length && !candidate.corpusSet.size) {
    const reasons = [
      "Complete your master resume to unlock stronger job matching",
      job.jobType ? `Job type available: ${job.jobType}` : "Add skills and projects for more accurate rankings",
      job.location ? `Location: ${job.location}` : "Profile data is currently too light for deep matching",
    ].filter(Boolean) as string[];

    return {
      score: 42,
      reasons: reasons.slice(0, 3),
      matchedSkills: [],
      breakdown: {
        skillOverlap: 0,
        projectOverlap: 0,
        experienceOverlap: 0,
        titleAlignment: 0,
        educationRelevance: 0,
        preferenceFit: 0,
        recencyBoost: job.recencyMs ? 0.04 : 0,
      },
      profileHash: candidate.profileHash,
      jobHash: job.jobHash,
    };
  }

  const matchedSkills = Array.from(
    new Set(
      candidate.rawSkills.filter((skill) => skill && (job.tags.includes(skill) || job.skillCorpus.includes(skill)))
    )
  );

  const matchedProjectTech = Array.from(
    new Set(
      candidate.projectTech.filter((tech) => tech && (job.tags.includes(tech) || job.skillCorpus.includes(tech)))
    )
  );

  const skillOverlap = clip01(matchedSkills.length / Math.max(1, Math.min(6, candidate.rawSkills.length || 1)));
  const projectOverlap = clip01(matchedProjectTech.length / Math.max(1, Math.min(5, candidate.projectTech.length || 1)));

  const experienceHitCount = job.keywordTokens.filter((token) => candidate.corpusSet.has(token)).length;
  const experienceOverlap = clip01(experienceHitCount / Math.max(3, Math.min(10, job.keywordTokens.length || 3)));
  const titleAlignment = overlapRatio(job.roleTokens, new Set(candidate.titleTokens));

  const educationCorpus = normalizeText(candidate.educationTerms.join(" "));
  const educationKeywords = ["btech", "b.e", "be", "mtech", "mca", "cse", "ece", "it", "computer", "engineering", "degree"];
  const educationRelevance = clip01(
    educationKeywords.filter((token) => (job.jdText + " " + job.title).includes(token) && educationCorpus.includes(token)).length / 3
  );

  const jobTypeFit = candidate.preferenceJobTypes.length
    ? candidate.preferenceJobTypes.some((pref) => pref === job.jobType)
      ? 1
      : 0
    : job.jobType
      ? 0.55
      : 0.35;

  const locationFit = candidate.preferenceLocations.length
    ? candidate.preferenceLocations.some((pref) => job.location.includes(pref)) || job.location.includes("remote")
      ? 1
      : 0
    : job.location.includes("remote")
      ? 0.75
      : job.location
        ? 0.45
        : 0.25;

  const domainFit = candidate.preferenceDomains.length
    ? candidate.preferenceDomains.some((pref) => job.jdText.includes(pref) || job.title.includes(pref) || job.tags.includes(pref))
      ? 1
      : 0
    : 0.5;

  const preferenceFit = clip01(jobTypeFit * 0.55 + locationFit * 0.25 + domainFit * 0.2);

  const ageDays = job.recencyMs ? (Date.now() - job.recencyMs) / 86_400_000 : 999;
  const recencyBoost = ageDays <= 3 ? 1 : ageDays <= 10 ? 0.65 : ageDays <= 30 ? 0.35 : 0.12;

  const weighted =
    skillOverlap * 35 +
    projectOverlap * 15 +
    experienceOverlap * 20 +
    titleAlignment * 10 +
    educationRelevance * 8 +
    preferenceFit * 8 +
    recencyBoost * 4;

  const score = clamp(Math.round(18 + weighted), 30, 98);

  const reasons: string[] = [];
  if (matchedSkills.length) reasons.push(`Matched skills: ${matchedSkills.slice(0, 4).join(", ")}`);
  if (matchedProjectTech.length) reasons.push(`Project stack overlap: ${matchedProjectTech.slice(0, 3).join(", ")}`);
  if (experienceHitCount > 0) {
    const highlighted = job.keywordTokens.filter((token) => candidate.corpusSet.has(token)).slice(0, 4);
    if (highlighted.length) reasons.push(`Resume experience aligns with: ${highlighted.join(", ")}`);
  }
  if (job.jobType && jobTypeFit >= 0.55) reasons.push(`Profile aligns with ${job.jobType.toLowerCase()} roles`);
  if (job.location && locationFit >= 0.75) reasons.push(`Location fit: ${job.location}`);
  if (!reasons.length) reasons.push("General resume and job description alignment detected");

  return {
    score,
    reasons: reasons.slice(0, 4),
    matchedSkills: matchedSkills.slice(0, 6),
    breakdown: {
      skillOverlap: Number(skillOverlap.toFixed(3)),
      projectOverlap: Number(projectOverlap.toFixed(3)),
      experienceOverlap: Number(experienceOverlap.toFixed(3)),
      titleAlignment: Number(titleAlignment.toFixed(3)),
      educationRelevance: Number(educationRelevance.toFixed(3)),
      preferenceFit: Number(preferenceFit.toFixed(3)),
      recencyBoost: Number(recencyBoost.toFixed(3)),
    },
    profileHash: candidate.profileHash,
    jobHash: job.jobHash,
  };
}

export function rankLocalJobs(input: CandidateInput & { jobs: JobInput[] }) {
  return input.jobs
    .map((job) => ({ ...job, local: scoreLocalJob({ user: input.user, profile: input.profile, id: job.id, data: job.data }) }))
    .sort((left, right) => {
      if (right.local.score !== left.local.score) return right.local.score - left.local.score;
      const rightMs = tsMs(right.data?.lastSeenAt) || tsMs(right.data?.postedAt) || tsMs(right.data?.createdAt) || tsMs(right.data?.updatedAt) || 0;
      const leftMs = tsMs(left.data?.lastSeenAt) || tsMs(left.data?.postedAt) || tsMs(left.data?.createdAt) || tsMs(left.data?.updatedAt) || 0;
      return rightMs - leftMs;
    });
}
