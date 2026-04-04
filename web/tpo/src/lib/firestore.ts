import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { slugify } from "@/lib/utils";
import type { AnnouncementDoc, ApplicationDoc, InstituteDoc, InstituteMemberDoc, JobDoc, UserDoc, NotificationDoc } from "@/lib/types";

// -------- helpers --------

// --- replace stripUndefinedDeep + tsMillis with this ---
import { Timestamp } from "firebase/firestore";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Object.prototype.toString.call(v) === "[object Object]";
}

export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined) return undefined as unknown as T;
  if (value === null) return value;

  // ✅ preserve Firestore special values
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value;

  // FieldValue (serverTimestamp(), arrayUnion, etc.) is NOT a plain object
  // but in case it is treated as object, preserve non-plain objects:
  const ctor = (value as any)?.constructor?.name;
  if (ctor === "FieldValue") return value;

  if (Array.isArray(value)) {
    return value
      .filter((v) => v !== undefined)
      .map((v) => stripUndefinedDeep(v)) as unknown as T;
  }

  if (typeof value === "object") {
    // ✅ only recurse into plain objects
    if (!isPlainObject(value)) return value;

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      const vv = stripUndefinedDeep(v);
      if (vv === undefined) continue;
      out[k] = vv;
    }
    return out as unknown as T;
  }

  return value;
}

function tsMillis(x: any): number {
  if (!x) return 0;
  if (typeof x?.toMillis === "function") return x.toMillis();
  if (typeof x?.toDate === "function") return x.toDate().getTime();
  if (typeof x?.seconds === "number") return x.seconds * 1000; // handles raw {seconds,nanoseconds}
  if (x instanceof Date) return x.getTime();
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const d = new Date(x);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  return 0;
}

export function jobIdFromAny(jobIdOrRef: string) {
  if (!jobIdOrRef) return "";
  return jobIdOrRef.replace(/^\/?jobs\//, "");
}


export function jobSortKey(j: JobDoc): number {
  return (
    tsMillis((j as any)?.sourceMeta?.deadlineAt) ||
    tsMillis((j as any)?.lastSeenAt) ||
    tsMillis((j as any)?.postedAt) ||
    tsMillis((j as any)?.createdAt) ||
    tsMillis((j as any)?.updatedAt) ||
    0
  );
}

// -------- Institute --------

export async function upsertInstituteAndMakeTpo(args: {
  uid: string;
  instituteName: string;
  instituteCode?: string;
  domainsAllowed: string[];
}) {
  const instituteName = args.instituteName.trim();
  if (!instituteName) throw new Error("Institute name is required");

  // ------------------------------
  // IMPORTANT:
  // Older versions of the app (and some manual Firebase setups) created institutes
  // with auto-generated doc IDs. Candidates may also create institutes using a slug.
  // To avoid duplicates, we RESOLVE an existing institute doc by code/name first.
  // Priority: instituteCode -> exact name -> fallback create.
  // ------------------------------

  const codeUpper = args.instituteCode?.trim() ? args.instituteCode.trim().toUpperCase() : "";

  // Try resolve by code
  let instituteId: string | null = null;
  if (codeUpper) {
    const qByCode = query(collection(db, "institutes"), where("code", "==", codeUpper), limit(1));
    const snap = await getDocs(qByCode);
    if (!snap.empty) instituteId = snap.docs[0]!.id;
  }

  // Try resolve by exact name
  if (!instituteId) {
    const qByName = query(collection(db, "institutes"), where("name", "==", instituteName), limit(1));
    const snap = await getDocs(qByName);
    if (!snap.empty) instituteId = snap.docs[0]!.id;
  }

  // Create deterministic id only if not found
  if (!instituteId) {
    instituteId = codeUpper || slugify(instituteName);
  }

  const instRef = doc(db, "institutes", instituteId);
  const memRef = doc(db, "institutes", instituteId, "members", args.uid);
  const userRef = doc(db, "users", args.uid);

  const batch = writeBatch(db);

  const instDoc: Partial<InstituteDoc> = {
    name: instituteName,
    code: codeUpper || undefined,
    domainsAllowed: args.domainsAllowed.map((d) => d.trim().toLowerCase()).filter(Boolean),
    // ✅ Candidate app will only allow colleges that have a configured TPO
    hasTpo: true,
    isConfigured: true,
    tpoConfiguredAt: serverTimestamp() as any,
    isActive: true,
    createdBy: args.uid,
    updatedAt: serverTimestamp() as any,
    createdAt: serverTimestamp() as any,
  };

  batch.set(instRef, stripUndefinedDeep(instDoc), { merge: true });

  const memDoc: InstituteMemberDoc = {
    uid: args.uid,
    role: "tpo",
    status: "active",
    joinedAt: serverTimestamp() as any,
  };
  batch.set(memRef, memDoc as any, { merge: true });

  batch.set(
    userRef,
    stripUndefinedDeep({
      uid: args.uid,
      role: "tpo",
      instituteId,
      updatedAt: serverTimestamp() as any,
    } as Partial<UserDoc>),
    { merge: true },
  );

  await batch.commit();

  return instituteId;
}

export function watchInstitute(instituteId: string, cb: (inst: InstituteDoc | null) => void) {
  const ref = doc(db, "institutes", instituteId);
  return onSnapshot(ref, (snap) => cb(snap.exists() ? (snap.data() as InstituteDoc) : null));
}

/**
 * One-time safety patch:
 * Older institute docs might not have hasTpo/isConfigured flags. We set them here so
 * Candidate-side institute picker can list this institute.
 */
export async function ensureInstituteConfiguredForTpo(instituteId: string) {
  const ref = doc(db, "institutes", instituteId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as InstituteDoc;
  if (data.hasTpo && data.isConfigured) return;
  await updateDoc(ref, stripUndefinedDeep({
    hasTpo: true,
    isConfigured: true,
    tpoConfiguredAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  }) as any);
}

export function watchInstituteMembers(
  instituteId: string,
  cb: (rows: Array<{ id: string; data: InstituteMemberDoc }>) => void,
) {
  const q = query(collection(db, "institutes", instituteId, "members"), limit(500));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, data: d.data() as InstituteMemberDoc }));
    cb(rows);
  });
}

export async function getUsersByIds(uids: string[]) {
  const unique = Array.from(new Set(uids)).filter(Boolean);
  const out = new Map<string, UserDoc>();
  await Promise.all(
    unique.map(async (uid) => {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) out.set(uid, snap.data() as UserDoc);
    }),
  );
  return out;
}

// -------- Jobs (Institute Verified) --------

export function watchInstituteJobs(
  instituteId: string,
  cb: (rows: Array<{ id: string; data: JobDoc }>) => void,
) {
  // Avoid composite indexes: query only instituteId, then filter client-side
  const q = query(collection(db, "jobs"), where("instituteId", "==", instituteId), limit(200));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs
      .map((d) => ({ id: d.id, data: d.data() as JobDoc }))
      .filter((r) => r.data.visibility === "institute" && r.data.source === "tpo")
      .sort((a, b) => jobSortKey(b.data) - jobSortKey(a.data));
    cb(rows);
  });
}

export async function createInstituteJob(args: {
  instituteId: string;
  createdBy: string;
  title: string;
  company: string;
  location?: string;
  jobType?: "Internship" | "Full-time";
  ctcOrStipend?: string;
  applyUrl?: string;
  jdText?: string;
  tags?: string[];
  eligibility?: JobDoc["sourceMeta"]["eligibility"];
  deadlineAt: Date;
  oaAt?: Date | null;
  interviewStartAt?: Date | null;
  interviewEndAt?: Date | null;
}) {
  const payload: JobDoc = stripUndefinedDeep({
    title: args.title.trim(),
    company: args.company.trim(),
    location: args.location?.trim() || "",
    jobType: args.jobType ?? "Internship",
    applyUrl: args.applyUrl?.trim() || "",
    jdText: args.jdText?.trim() || "",
    tags: args.tags ?? [],

    source: "tpo",
    visibility: "institute",
    instituteId: args.instituteId,
    ownerUid: null,

    status: "open",
    postedAt: serverTimestamp() as any,
    lastSeenAt: serverTimestamp() as any,
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,

    sourceMeta: {
      verified: true,
      ctcOrStipend: args.ctcOrStipend?.trim() || undefined,
      eligibility: args.eligibility,
      deadlineAt: Timestamp.fromDate(args.deadlineAt),
      oaAt: args.oaAt ? Timestamp.fromDate(args.oaAt) : null,
      interviewStartAt: args.interviewStartAt ? Timestamp.fromDate(args.interviewStartAt) : null,
      interviewEndAt: args.interviewEndAt ? Timestamp.fromDate(args.interviewEndAt) : null,
    },
  });

  const ref = await addDoc(collection(db, "jobs"), payload as any);
  return ref.id;
}

export async function updateJobStatus(jobId: string, status: "open" | "closed") {
  await updateDoc(doc(db, "jobs", jobId), { status, updatedAt: serverTimestamp() } as any);
}

// -------- Applications --------

export function watchInstituteApplications(
  instituteId: string,
  cb: (rows: Array<{ id: string; data: ApplicationDoc }>) => void,
) {
  const q = query(collection(db, "applications"), where("instituteId", "==", instituteId), limit(500));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs
      .map((d) => ({ id: d.id, data: d.data() as ApplicationDoc }))
      .sort((a, b) => tsMillis((b.data as any).updatedAt) - tsMillis((a.data as any).updatedAt));
    cb(rows);
  });
}

// -------- Announcements --------

export function watchInstituteAnnouncements(
  instituteId: string,
  cb: (rows: Array<{ id: string; data: AnnouncementDoc }>) => void,
) {
  const q = query(collection(db, "institutes", instituteId, "announcements"), limit(200));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs
      .map((d) => ({ id: d.id, data: d.data() as AnnouncementDoc }))
      .sort((a, b) => tsMillis((b.data as any).createdAt) - tsMillis((a.data as any).createdAt));
    cb(rows);
  });
}

export async function createAnnouncement(instituteId: string, payload: Omit<AnnouncementDoc, "instituteId">) {
  const ref = await addDoc(collection(db, "institutes", instituteId, "announcements"),
    stripUndefinedDeep({
      ...payload,
      instituteId,
      createdAt: serverTimestamp() as any,
    }) as any,
  );
  return ref.id;
}

export async function toggleAnnouncementPinned(instituteId: string, id: string, pinned: boolean) {
  await updateDoc(doc(db, "institutes", instituteId, "announcements", id), { pinned } as any);
}

// -------- Notifications (to Candidate app) --------

async function listStudentMembers(instituteId: string): Promise<Array<{ uid: string; data: InstituteMemberDoc }>> {
  const q = query(collection(db, "institutes", instituteId, "members"), limit(2000));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ uid: d.id, data: d.data() as InstituteMemberDoc }))
    .filter((r) => r.data.role === "student");
}

async function batchWriteNotifications(uids: string[], payload: Omit<NotificationDoc, "createdAt">) {
  // Firestore batch limit is 500 writes. Use 400 to be safe.
  const CHUNK = 400;
  for (let i = 0; i < uids.length; i += CHUNK) {
    const slice = uids.slice(i, i + CHUNK);
    const batch = writeBatch(db);

    slice.forEach((uid) => {
      const ref = doc(collection(db, "users", uid, "notifications"));
      batch.set(
        ref,
        stripUndefinedDeep({
          ...payload,
          read: false,
          createdAt: serverTimestamp() as any,
        }) as any,
        { merge: true },
      );
    });

    await batch.commit();
  }
}

export async function broadcastAnnouncementToCandidates(args: {
  instituteId: string;
  announcementId: string;
  title: string;
  message: string;
  targetType: AnnouncementDoc["targetType"];
  targetLabel: string;
  pinned: boolean;
}) {
  const members = await listStudentMembers(args.instituteId);

  // simple targeting: branch/batch
  const targetUids = members
    .filter((m) => {
      if (args.targetType === "all") return true;
      if (args.targetType === "branch") return (m.data.branch ?? "") === args.targetLabel;
      if (args.targetType === "batch") return (m.data.batch ?? "") === args.targetLabel;
      // custom: treat targetLabel as comma-separated UIDs (optional)
      if (args.targetType === "custom") {
        const set = new Set(args.targetLabel.split(",").map((x) => x.trim()).filter(Boolean));
        return set.size ? set.has(m.uid) : true;
      }
      return true;
    })
    .map((m) => m.uid);

  const title = args.pinned ? `📌 ${args.title}` : args.title;

  const payload: Omit<NotificationDoc, "createdAt"> = {
    type: "announcement",
    title,
    body: args.message,
    read: false,
    related: {
      url: "/notifications",
    },
  };

  await batchWriteNotifications(targetUids, payload);
}

export async function broadcastNewDriveToCandidates(args: {
  instituteId: string;
  jobId: string;
  title: string;
  company: string;
  deadlineAt?: Timestamp | Date | null;
  eligibility?: JobDoc["sourceMeta"]["eligibility"];
}) {
  const members = await listStudentMembers(args.instituteId);

  const eligibleUids = members
    .filter((m) => {
      const e = args.eligibility;
      if (!e) return true;
      if (e.branches && e.branches.length > 0) {
        const br = (m.data.branch ?? "").trim();
        if (!e.branches.includes(br)) return false;
      }
      if (e.batch) {
        const bt = (m.data.batch ?? "").trim();
        if (bt !== e.batch) return false;
      }
      if (typeof e.minCgpa === "number" && e.minCgpa !== null) {
        const cg = typeof m.data.cgpa === "number" ? m.data.cgpa : null;
        if (cg === null) return false;
        if (cg < e.minCgpa) return false;
      }
      return true;
    })
    .map((m) => m.uid);

  const deadline = (args.deadlineAt as any)?.toDate?.() ? (args.deadlineAt as any).toDate() : (args.deadlineAt instanceof Date ? args.deadlineAt : null);
  const deadlineStr = deadline ? deadline.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

  const payload: Omit<NotificationDoc, "createdAt"> = {
    type: "announcement",
    title: `New Institute Drive: ${args.company} — ${args.title}`,
    body: deadlineStr ? `Deadline: ${deadlineStr}. Check Jobs → Institute Verified.` : `New drive posted. Check Jobs → Institute Verified.`,
    read: false,
    related: {
      jobId: args.jobId,
      url: "/jobs",
    },
  };

  await batchWriteNotifications(eligibleUids, payload);
}
