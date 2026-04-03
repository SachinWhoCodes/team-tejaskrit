import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../_lib/firebaseAdmin.js";
import { getBearerToken, requireUser } from "../_lib/auth.js";
import { verifyLatexUrlSig } from "../_lib/util.js";

function bad(res: VercelResponse, status: number, msg: string) {
  return res.status(status).send(msg);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return bad(res, 405, "Method not allowed");

  const applicationId = String(req.query.applicationId ?? "").trim();
  if (!applicationId) return bad(res, 400, "applicationId is required");

  const db = getAdminDb();
  const appRef = db.collection("applications").doc(applicationId);
  const appSnap = await appRef.get();
  if (!appSnap.exists) return bad(res, 404, "Application not found");
  const app = appSnap.data() || {};

  // Two access modes:
  // 1) Normal: candidate calls with Firebase ID token -> only allow owner.
  // 2) Signed URL: LaTeX.Online fetches without auth -> validate exp+sig.
  const token = getBearerToken(req);
  if (token) {
    const u = await requireUser(req);
    if (app.userId !== u.uid) return bad(res, 403, "Forbidden");
  } else {
    const exp = Number(req.query.exp ?? 0);
    const sig = String(req.query.sig ?? "");
    if (!exp || !sig) return bad(res, 401, "Missing signature");
    if (Date.now() > exp) return bad(res, 401, "Signature expired");
    if (!verifyLatexUrlSig(applicationId, exp, sig)) return bad(res, 401, "Invalid signature");
  }

  const latex = app?.tailoredResume?.latex;
  if (!latex || typeof latex !== "string") return bad(res, 404, "LaTeX not available");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(latex);
}
