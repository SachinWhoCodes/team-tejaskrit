import { auth } from "@/lib/firebase";
import { extractPdfJsonClient, type ImportedPdfJson } from "@/lib/pdf-import";

export type ImportedDriveForm = {
  title: string;
  company: string;
  location: string;
  jobType: "" | "Internship" | "Full-time";
  ctcOrStipend: string;
  applyUrl: string;
  jdText: string;
  eligibleBranches: string[];
  batch: string;
  minCgpa: string;
  skillsCsv: string;
  seatLimit: string;
  deadlineLocal: string;
  oaLocal: string;
  interviewStart: string;
  interviewEnd: string;
  missingFields?: string[];
  confidence?: Record<string, number>;
};

export async function mapImportedJobWithGroq(
  rawPdfJson: ImportedPdfJson,
): Promise<ImportedDriveForm> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const idToken = await user.getIdToken();

  const res = await fetch("/api/map-imported-job", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ rawPdfJson }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }

  return json.mapped;
}

export async function importJobFromPdf(file: File): Promise<{
  rawPdfJson: ImportedPdfJson;
  mapped: ImportedDriveForm;
}> {
  const rawPdfJson = await extractPdfJsonClient(file);
  const mapped = await mapImportedJobWithGroq(rawPdfJson);
  return { rawPdfJson, mapped };
}
