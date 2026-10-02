import { db } from "@/db";
import { sql } from "drizzle-orm";
import { config } from "@/server/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const t0 = Date.now();
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      service: "vitalloop-backend",
      version: config.version,
      api: config.apiVersion,
      dbLatencyMs: Date.now() - t0,
      uptimeSec: Math.round(process.uptime()),
    });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
