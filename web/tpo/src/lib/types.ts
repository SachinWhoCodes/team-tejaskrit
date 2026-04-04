import type { Timestamp } from "firebase/firestore";

export type UserRole = "student" | "tpo" | "admin";

export type JobSource = "scraped" | "telegram" | "tpo" | "extension" | "manual";
export type JobVisibility = "public" | "institute" | "private";

export type ApplicationStatus =
  | "saved"
  | "tailored"
  | "applied"
  | "oa_scheduled"
  | "interview_scheduled"
  | "offer"
  | "rejected"
  | "joined"
  | "withdrawn";

export interface InstituteDoc {
  name: string;
  code?: string;
  domainsAllowed?: string[];
  // ✅ for Candidate-side institute picker: only show institutes that have an onboarded TPO
  hasTpo?: boolean;
  isConfigured?: boolean;
  tpoConfiguredAt?: Timestamp;
  isActive?: boolean;
  createdAt?: Timestamp;
  createdBy?: string;
  updatedAt?: Timestamp;
}

export interface InstituteMemberDoc {
  uid: string;
  role: UserRole;
  status?: "active" | "inactive";
  joinedAt?: Timestamp;
  branch?: string;
  batch?: string;
  cgpa?: number | null;
  // TPO-only notes
  tpoNotes?: string;
}

export interface UserDoc {
  uid: string;
  email?: string | null;
  name?: string | null;
  photoUrl?: string | null;
  phone?: string;
  role?: UserRole;
  instituteId?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface JobDoc {
  title: string;
  company: string;
  location?: string;
  jobType?: "Internship" | "Full-time";
  applyUrl?: string;
  jdText?: string;
  tags?: string[];

  source: JobSource;
  visibility: JobVisibility;
  instituteId?: string | null;
  ownerUid?: string | null;

  status?: "open" | "closed" | "unknown";
  postedAt?: Timestamp;
  lastSeenAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;

  // Anything TPO-specific goes here to avoid schema conflicts
  sourceMeta?: {
    verified?: boolean;
    ctcOrStipend?: string;
    eligibility?: {
      branches: string[];
      batch?: string | null;
      minCgpa?: number | null;
      skills?: string[];
      seatLimit?: number | null;
    };
    deadlineAt?: Timestamp;
    oaAt?: Timestamp | null;
    interviewStartAt?: Timestamp | null;
    interviewEndAt?: Timestamp | null;
  };
}

export interface ApplicationDoc {
  userId: string;
  instituteId?: string | null;
  jobId: string; // may be stored as "jobs/{id}" in candidate app
  status: ApplicationStatus;
  matchScore?: number | null;
  matchReasons?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  appliedAt?: Timestamp | null;
  lastEventAt?: Timestamp | null;
  notes?: string;
  tailoredResume?: {
    latex?: string;
    generatedAt?: Timestamp;
    genId?: string;
  };
}

export interface AnnouncementDoc {
  instituteId: string;
  createdBy: string;
  createdAt?: Timestamp;
  title: string;
  message: string;
  targetType: "all" | "branch" | "batch" | "drive" | "custom";
  targetLabel: string;
  pinned: boolean;
  scheduledAt?: Timestamp | null;
}

// Candidate app reads notifications from /users/{uid}/notifications
export interface NotificationDoc {
  type: "match" | "reminder" | "announcement" | "update";
  title: string;
  body: string;
  read: boolean;
  createdAt?: Timestamp;
  related?: {
    applicationId?: string;
    jobId?: string;
    url?: string;
  };
}
