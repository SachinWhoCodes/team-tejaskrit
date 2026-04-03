import type { ApplicationStatusKey, JobSourceKey } from "./types";

export type JobSourceLabel =
  | "Career Page"
  | "Telegram"
  | "Institute Verified"
  | "Extension"
  | "Manual";

export function sourceLabel(source: JobSourceKey, instituteVerified = false): JobSourceLabel {
  if (instituteVerified) return "Institute Verified";
  switch (source) {
    case "scraped":
      return "Career Page";
    case "telegram":
      return "Telegram";
    case "tpo":
      return "Institute Verified";
    case "extension":
      return "Extension";
    case "manual":
      return "Manual";
    default:
      return "Career Page";
  }
}

export type ApplicationStatusLabel =
  | "Saved"
  | "Tailored"
  | "Applied"
  | "OA Scheduled"
  | "Interview Scheduled"
  | "Offer"
  | "Joined"
  | "Rejected"
  | "Withdrawn";

export function statusLabel(status: ApplicationStatusKey): ApplicationStatusLabel {
  switch (status) {
    case "saved":
      return "Saved";
    case "tailored":
      return "Tailored";
    case "applied":
      return "Applied";
    case "oa_scheduled":
      return "OA Scheduled";
    case "interview_scheduled":
      return "Interview Scheduled";
    case "offer":
      return "Offer";
    case "joined":
      return "Joined";
    case "rejected":
      return "Rejected";
    case "withdrawn":
      return "Withdrawn";
  }
}

export const STATUS_COLUMNS: ApplicationStatusKey[] = [
  "saved",
  "tailored",
  "applied",
  "oa_scheduled",
  "interview_scheduled",
  "offer",
  "joined",
  "rejected",
  "withdrawn",
];
