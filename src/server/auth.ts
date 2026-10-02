// ── Auth: MSISDN sessions (HMAC) + admin/cron keys + telco webhook signatures ──
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret-change-me";

export type Session = { subscriberId: number; msisdn: string; iat: number; exp: number };

function b64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}
function unb64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function mintSession(subscriberId: number, msisdn: string, ttlHours = 24 * 30): string {
  const body: Session = {
    subscriberId,
    msisdn,
    iat: Date.now(),
    exp: Date.now() + ttlHours * 3600_000,
  };
  const payload = b64url(JSON.stringify(body));
  const sig = createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `vl1.${payload}.${sig}`;
}

export function verifySession(token: string | null): Session | null {
  if (!token || !token.startsWith("vl1.")) return null;
  const [, payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const body = JSON.parse(unb64url(payload)) as Session;
    if (body.exp < Date.now()) return null;
    return body;
  } catch {
    return null;
  }
}

export function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export function requireAdmin(req: Request): boolean {
  const key = req.headers.get("x-admin-key") || new URL(req.url).searchParams.get("adminKey");
  return !!key && key === (process.env.ADMIN_KEY || "dev-admin-key");
}

export function requireCron(req: Request): boolean {
  // demo-friendly: allow when no CRON_SECRET configured explicitly
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const got = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("cronSecret");
  return got === secret;
}

// Telco webhook HMAC check (aggregators sign callbacks; simulator uses shared secret)
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret?: string): boolean {
  const s = secret || process.env.TELCO_WEBHOOK_SECRET || "dev-telco-secret";
  if (!signature) return false;
  const expected = createHmac("sha256", s).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
