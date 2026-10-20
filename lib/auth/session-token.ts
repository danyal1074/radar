import { createHmac, timingSafeEqual } from "node:crypto";

/** Signed, expiring session token for DEV auth: base64url(payload).hmac */
export interface SessionPayload {
  uid: string;
  exp: number; // unix seconds
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function signSession(payload: SessionPayload, secret: string): string {
  const body = b64(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined, secret: string, nowSec = Math.floor(Date.now() / 1000)): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof p.uid !== "string" || typeof p.exp !== "number" || p.exp < nowSec) return null;
    return p;
  } catch {
    return null;
  }
}
