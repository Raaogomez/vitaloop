// ── Structured logger (JSON in prod, pretty in dev) ──
type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, scope: string, msg: string, data?: Record<string, unknown>) {
  const entry = {
    t: new Date().toISOString(),
    level,
    scope,
    msg,
    ...(data ? { data } : {}),
  };
  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify(entry));
  } else {
    const icon = level === "error" ? "❌" : level === "warn" ? "⚠️" : level === "debug" ? "🔍" : "ℹ️";
    console.log(`${icon} [${scope}] ${msg}`, data ? JSON.stringify(data).slice(0, 400) : "");
  }
}

export const logger = {
  debug: (scope: string, msg: string, data?: Record<string, unknown>) => emit("debug", scope, msg, data),
  info: (scope: string, msg: string, data?: Record<string, unknown>) => emit("info", scope, msg, data),
  warn: (scope: string, msg: string, data?: Record<string, unknown>) => emit("warn", scope, msg, data),
  error: (scope: string, msg: string, data?: Record<string, unknown>) => emit("error", scope, msg, data),
};
