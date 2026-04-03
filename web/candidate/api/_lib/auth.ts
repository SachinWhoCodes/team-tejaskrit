import type { VercelRequest } from "@vercel/node";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "./firebaseAdmin.js";

export type AuthedUser = { uid: string; email?: string | null; name?: string | null };

export function getBearerToken(req: VercelRequest): string | null {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;
  const s = Array.isArray(h) ? h[0] : h;
  const m = /^Bearer\s+(.+)$/.exec(s);
  return m?.[1] ?? null;
}

export async function requireUser(req: VercelRequest): Promise<AuthedUser> {
  const token = getBearerToken(req);
  if (!token) throw new Error("Missing Authorization: Bearer <firebase_id_token>");

  const app = getAdminApp();
  const auth = getAuth(app);
  const decoded = await auth.verifyIdToken(token);
  return { uid: decoded.uid, email: decoded.email ?? null, name: decoded.name ?? null };
}
