import crypto from "crypto";

// Firestore disallows `undefined` anywhere.
export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined) return undefined as unknown as T;
  if (value === null) return value;
  if (Array.isArray(value)) {
    return value.filter((v) => v !== undefined).map((v) => stripUndefinedDeep(v)) as unknown as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      const vv = stripUndefinedDeep(v);
      if (vv === undefined) continue;
      out[k] = vv;
    }
    return out as unknown as T;
  }
  return value;
}

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function signLatexUrl(applicationId: string, expMs: number) {
  const secret = requireEnv("LATEX_SIGNING_SECRET");
  const payload = `${applicationId}.${expMs}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return { exp: expMs, sig };
}

export function verifyLatexUrlSig(applicationId: string, expMs: number, sig: string) {
  const secret = requireEnv("LATEX_SIGNING_SECRET");
  const payload = `${applicationId}.${expMs}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  // timingSafeEqual requires same length buffers
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
