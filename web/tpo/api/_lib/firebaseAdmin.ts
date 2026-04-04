import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function requireEnv(name: string) {
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
  return initializeApp({
    credential: cert(getServiceAccount()),
  });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
