import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;

const BRANCHES = ["CSE", "IT", "ECE", "EE", "ME", "CE"];

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function cleanText(s: string) {
  return String(s || "")
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function clip(s: string, n: number) {
  const t = String(s || "");
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function extractSignals(text: string) {
  const urls = uniq(
    Array.from(text.matchAll(/https?:\/\/[^\s)>\]]+/gi)).map((m) =>
      m[0].trim(),
    ),
  ).slice(0, 20);

  const emails = uniq(
    Array.from(text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)).map(
      (m) => m[0].trim(),
    ),
  ).slice(0, 20);

  const phoneHints = uniq(
    Array.from(text.matchAll(/(?:\+91[-\s]?)?[6-9]\d{9}\b/g)).map((m) =>
      m[0].trim(),
    ),
  ).slice(0, 20);

  const moneyHints = uniq(
    Array.from(
      text.matchAll(
        /(?:₹|Rs\.?|INR)\s?[\d,.]+(?:\s?(?:LPA|lpa|CTC|per month|\/month|pm|per annum|annum|pa))?/g,
      ),
    ).map((m) => m[0].trim()),
  ).slice(0, 20);

  const cgpaHints = uniq(
    Array.from(
      text.matchAll(
        /(?:CGPA|CPI|GPA|Minimum CGPA|Min\.?\s*CGPA)[^\d]{0,12}(\d(?:\.\d{1,2})?)/gi,
      ),
    ).map((m) => m[1].trim()),
  ).slice(0, 10);

  const dateHints = uniq(
    Array.from(
      text.matchAll(
        /\b(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/gi,
      ),
    ).map((m) => m[0].trim()),
  ).slice(0, 30);

  const branchHints = BRANCHES.filter((b) =>
    new RegExp(`\\b${b}\\b`, "i").test(text),
  );

  const jobTypeHint = /\bintern(ship)?\b/i.test(text)
    ? "Internship"
    : /\bfull[\s-]?time\b|\bfte\b|\bsoftware engineer\b|\bsde\b/i.test(text)
      ? "Full-time"
      : "";

  return {
    urls,
    emails,
    phoneHints,
    moneyHints,
    cgpaHints,
    dateHints,
    branchHints,
    jobTypeHint,
  };
}

export type ImportedPdfJson = {
  filename: string;
  fileSize: number;
  contentType: string;
  pageCount: number;
  metadata: Record<string, unknown>;
  pages: Array<{
    pageNumber: number;
    text: string;
    charCount: number;
  }>;
  fullText: string;
  signals: {
    urls: string[];
    emails: string[];
    phoneHints: string[];
    moneyHints: string[];
    cgpaHints: string[];
    dateHints: string[];
    branchHints: string[];
    jobTypeHint: string;
  };
  targetSchema: Record<string, string | string[]>;
};

export async function extractPdfJsonClient(
  file: File,
): Promise<ImportedPdfJson> {
  const bytes = await file.arrayBuffer();

  const loadingTask = (pdfjsLib as any).getDocument({
    data: bytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const meta = await pdf.getMetadata().catch(() => null);

  const pages: ImportedPdfJson["pages"] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const text = cleanText(
      textContent.items.map((item: any) => item?.str || "").join(" "),
    );

    pages.push({
      pageNumber: i,
      text,
      charCount: text.length,
    });
  }

  const fullText = cleanText(
    pages.map((p) => `Page ${p.pageNumber}\n${p.text}`).join("\n\n"),
  );
  const signals = extractSignals(fullText);

  return {
    filename: file.name,
    fileSize: file.size,
    contentType: file.type || "application/pdf",
    pageCount: pdf.numPages,
    metadata: {
      info: meta?.info || {},
      metadata: meta?.metadata?.getAll?.() || {},
      contentDispositionFilename:
        (pdf as any)?._transport?._fullReader?.filename || "",
    },
    pages: pages.map((p) => ({
      ...p,
      text: clip(p.text, 15000),
    })),
    fullText: clip(fullText, 60000),
    signals,
    targetSchema: {
      title: "string",
      company: "string",
      location: "string",
      jobType: '"" | "Internship" | "Full-time"',
      ctcOrStipend: "string",
      applyUrl: "string",
      jdText: "string",
      eligibleBranches: BRANCHES,
      batch: ["", "2024", "2025", "2026", "2027"],
      minCgpa: "string",
      skillsCsv: "string",
      seatLimit: "string",
      deadlineLocal: "YYYY-MM-DDTHH:mm or empty string",
      oaLocal: "YYYY-MM-DDTHH:mm or empty string",
      interviewStart: "YYYY-MM-DDTHH:mm or empty string",
      interviewEnd: "YYYY-MM-DDTHH:mm or empty string",
    },
  };
}
