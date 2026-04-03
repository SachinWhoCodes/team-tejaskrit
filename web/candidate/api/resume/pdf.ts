import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../_lib/firebaseAdmin.js";
import { requireUser } from "../_lib/auth.js";
import { signLatexUrl } from "../_lib/util.js";

function bad(res: VercelResponse, status: number, msg: string) {
  return res.status(status).json({ ok: false, error: msg });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return bad(res, 405, "Method not allowed");

  try {
    const u = await requireUser(req);
    const applicationId = String(req.query.applicationId ?? "").trim();
    if (!applicationId) return bad(res, 400, "applicationId is required");

    const db = getAdminDb();
    const appRef = db.collection("applications").doc(applicationId);
    const appSnap = await appRef.get();
    if (!appSnap.exists) return bad(res, 404, "Application not found");
    const app = appSnap.data() || {};
    if (app.userId !== u.uid) return bad(res, 403, "Forbidden");

    const latex = app?.tailoredResume?.latex;
    if (!latex || typeof latex !== "string") return bad(res, 404, "LaTeX not available");

    // Build a short-lived signed URL so latexonline.cc can fetch the .tex from our endpoint.
    const host = String(req.headers["x-forwarded-host"] || req.headers.host);
    const proto = String(req.headers["x-forwarded-proto"] || "https");
    const exp = Date.now() + 2 * 60 * 1000; // 2 minutes
    const { sig } = signLatexUrl(applicationId, exp);

    const latexUrl = `${proto}://${host}/api/resume/latex?applicationId=${encodeURIComponent(applicationId)}&exp=${exp}&sig=${sig}`;

    // Use LaTeX.Online REST API to compile (no TeXLive needed on Vercel).
    // Optional args from docs: command=... and download=...
    const compileUrl = `https://latexonline.cc/compile?url=${encodeURIComponent(latexUrl)}&command=pdflatex&download=resume.pdf`;

    const r = await fetch(compileUrl, { method: "GET" });
    if (!r.ok) {
      const errText = await r.text().catch(() => r.statusText);
      return bad(res, 502, `LaTeX compile failed: ${errText}`);
    }

    const buf = Buffer.from(await r.arrayBuffer());

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="resume.pdf"');
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(buf);
  } catch (e: any) {
    return bad(res, 500, e?.message ?? "Unknown error");
  }
}
