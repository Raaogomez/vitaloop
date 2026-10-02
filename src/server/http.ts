// ── HTTP helpers: handler wrapper, pagination, rate limit, idempotency ──
import { fail, ApiError } from "./errors";
import { config } from "./config";
import { logger } from "./logger";

type Ctx = { req: Request; url: URL; requestId: string };

type Handler = (ctx: Ctx) => Promise<Response> | Response;

// naive in-memory rate limiter (per instance; use Redis/Upstash in prod)
const hits = new Map<string, { n: number; reset: number }>();

function rateLimit(key: string): boolean {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now > cur.reset) {
    hits.set(key, { n: 1, reset: now + config.rateLimit.windowMs });
    return true;
  }
  cur.n += 1;
  return cur.n <= config.rateLimit.maxPerWindow;
}

export function withApi(handler: Handler, opts?: { scope?: string; rateLimitBy?: (ctx: Ctx) => string | null }) {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const requestId = `rq_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
    const ctx: Ctx = { req, url, requestId };
    const t0 = Date.now();
    try {
      const keyFn = opts?.rateLimitBy;
      if (keyFn) {
        const key = keyFn(ctx);
        if (key && !rateLimit(`${opts?.scope ?? "api"}:${key}`)) {
          throw new ApiError("RATE_LIMITED", "Too many requests — slow down and retry.");
        }
      }
      const res = await handler(ctx);
      res.headers.set("x-request-id", requestId);
      res.headers.set("x-api-version", config.apiVersion);
      logger.info(opts?.scope ?? "api", `${req.method} ${url.pathname} → ${res.status} in ${Date.now() - t0}ms`);
      return res;
    } catch (err) {
      logger.error(opts?.scope ?? "api", `${req.method} ${url.pathname} failed`, {
        requestId,
        error: err instanceof Error ? err.message : String(err),
      });
      const res = fail(err);
      res.headers.set("x-request-id", requestId);
      return res;
    }
  };
}

export function pagination(url: URL, def = 20, max = 100) {
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(max, Math.max(1, Number(url.searchParams.get("limit") || def)));
  return { page, limit, offset: (page - 1) * limit };
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError("BAD_REQUEST", "Invalid JSON body");
  }
}
