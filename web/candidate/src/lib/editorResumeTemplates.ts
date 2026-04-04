export type EditorResumeTemplate = {
  id: string;
  name: string;
  byline: string;
  shortLabel: string;
  description: string;
  highlights: string[];
  prompt: string;
};

export const EDITOR_RESUME_TEMPLATES: EditorResumeTemplate[] = [
  {
    id: "anubhav-singh",
    name: "By Anubhav Singh",
    byline: "Compact ATS one-page adaptation",
    shortLabel: "Anubhav Singh",
    description:
      "A compact single-page resume with a strong header, sharp section dividers, concise bullets, and dense but readable spacing.",
    highlights: ["One-page layout", "ATS-friendly sections", "Compact skills + impact bullets"],
    prompt:
      [
        "Rewrite the current resume into a compact one-page LaTeX resume inspired by the Anubhav Singh style.",
        "Keep it pdflatex-compatible and intentionally short.",
        "Use a single clean header with name, email, phone, and 2-3 links.",
        "Use section order: Summary, Skills, Experience, Projects, Education, Achievements.",
        "Use crisp section headings with thin dividers, compact spacing, and concise bullet points.",
        "Avoid long paragraphs, large tables, nested complexity, and unnecessary packages.",
        "Prefer article class, geometry, enumitem, hyperref, xcolor, titlesec only if needed.",
        "Keep the final output clearly one-page friendly and factually grounded in the current resume.",
      ].join(" "),
  },
  {
    id: "tejaskrit-compact",
    name: "Tejaskrit Compact",
    byline: "Minimal modern one-page layout",
    shortLabel: "Tejaskrit Compact",
    description:
      "A modern minimal layout with a focused summary, compact skill chips style in text, and clean bullet grouping for quick recruiter scanning.",
    highlights: ["Minimal modern look", "Fast-scanning layout", "Short preview-friendly source"],
    prompt:
      [
        "Rewrite the current resume into a minimal modern one-page LaTeX resume called Tejaskrit Compact.",
        "Keep it pdflatex-compatible and very compact so preview compilation stays reliable.",
        "Use only essential packages and keep the source short.",
        "Use a neat header, a 2-3 line summary, compact skills lines, strong experience bullets, short project bullets, and concise education.",
        "Keep whitespace balanced, remove repetition, and prefer fewer stronger bullets over many weak ones.",
        "Avoid tables unless absolutely necessary; simple aligned lines are preferred.",
        "Do not invent facts. Preserve relevance to the current job and current resume content.",
      ].join(" "),
  },
];

export function getEditorResumeTemplate(templateId: string) {
  return EDITOR_RESUME_TEMPLATES.find((template) => template.id === templateId) ?? EDITOR_RESUME_TEMPLATES[0];
}

export function buildApplyTemplatePrompt(template: EditorResumeTemplate) {
  return [
    template.prompt,
    "Return only the full updated LaTeX document.",
    "Keep it one page wherever realistically possible.",
    "Keep package usage minimal and safe for pdflatex preview compilation.",
  ].join(" ");
}
