import { db } from "@/db";
import { sql } from "drizzle-orm";
import { withApi } from "@/server/http";
import { ok } from "@/server/errors";
import { config } from "@/server/config";
import { tableCounts } from "@/server/services/admin";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const t0 = Date.now();
  await db.execute(sql`select 1`);
  const latencyMs = Date.now() - t0;
  const counts = await tableCounts().catch(() => ({}));
  return ok(
    {
      service: "vitalloop-backend",
      version: config.version,
      api: config.apiVersion,
      env: config.env,
      dcbMode: config.dcb.mode,
      uptimeSec: Math.round(process.uptime()),
      db: { reachable: true, latencyMs },
      counts,
      services: [
        "subscribers", "wellness", "verification", "health-connect",
        "billing", "challenges", "devices", "webhooks", "jobs", "agent",
      ],
    },
    { requestAt: new Date().toISOString() }
  );
}, { scope: "v1-status" });
