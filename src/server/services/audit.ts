// ── Audit log helper ──
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function audit(
  subscriberId: number | null,
  action: string,
  detail?: Record<string, unknown>,
  actor = "system"
) {
  try {
    await db.insert(auditLogs).values({
      subscriberId,
      actor,
      action,
      detail: detail ?? {},
    });
  } catch {
    // audit must never break the main flow
  }
}

export async function auditList(limit = 50) {
  const { desc } = await import("drizzle-orm");
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}
