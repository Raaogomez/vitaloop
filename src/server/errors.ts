// ── Typed API errors + uniform envelope ──
export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  INTERNAL: 500,
};

export class ApiError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;
  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return Response.json({ ok: true, ...(meta ? { meta } : {}), data });
}

export function fail(err: unknown) {
  if (err instanceof ApiError) {
    return Response.json(
      { ok: false, error: { code: err.code, message: err.message, details: err.details ?? null } },
      { status: err.status }
    );
  }
  console.error("[api] unhandled", err);
  return Response.json(
    { ok: false, error: { code: "INTERNAL", message: "Unexpected server error" } },
    { status: 500 }
  );
}

export const badRequest = (msg: string, details?: unknown) => new ApiError("BAD_REQUEST", msg, details);
export const notFound = (msg: string) => new ApiError("NOT_FOUND", msg);
export const unauthorized = (msg = "Missing or invalid credentials") => new ApiError("UNAUTHORIZED", msg);
export const forbidden = (msg = "Forbidden") => new ApiError("FORBIDDEN", msg);
export const conflict = (msg: string) => new ApiError("CONFLICT", msg);
