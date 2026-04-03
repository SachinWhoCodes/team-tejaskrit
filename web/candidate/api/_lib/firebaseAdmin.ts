import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Vercel Functions run in a privileged environment (server-side).
 * We initialize Firebase Admin SDK using a service-account JSON.
 *
 * Set on Vercel:
 *  - FIREBASE_ADMIN_CREDENTIALS_B64: base64(serviceAccountJson)
 */

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getServiceAccount() {
  const b64 = requireEnv("FIREBASE_ADMIN_CREDENTIALS_B64");
  const json = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(json);
}

export function getAdminApp() {
  if (getApps().length) return getApps()[0]!;
  const sa = getServiceAccount();
  return initializeApp({ credential: cert(sa) });
}

export function getAdminDb() {
  const app = getAdminApp();
  return getFirestore(app);
}
