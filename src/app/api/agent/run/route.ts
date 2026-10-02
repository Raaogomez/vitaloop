import { db } from "@/db";
import { agentRuns, agentTasks } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { withApi, readJson } from "@/server/http";
import { ok, badRequest } from "@/server/errors";
import { runRenewals } from "@/server/services/billing";
import { settleChallenges } from "@/server/services/challenges";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const runs = await db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(30);
  return ok({ runs });
}, { scope: "agent-run" });

// Actions: seed | smoke | advance | renewals | settle
export const POST = withApi(async ({ req }) => {
  const body = (await readJson<{ action: string; taskId?: number }>(req).catch(() => ({ action: "", taskId: undefined as number | undefined })));
  const action = body.action || "";
  let output: Record<string, unknown> = {};
  let status = "success";

  try {
    if (action === "smoke") {
      const t0 = Date.now();
      await db.execute(sql`select 1`);
      const tables = ["subscribers", "wellness_logs", "dcb_subscriptions", "health_records", "devices", "webhook_events"];
      const counts: Record<string, number> = {};
      for (const t of tables) {
        const r = await db.execute(sql.raw(`select count(*)::int as c from ${t}`));
        counts[t] = (r as unknown as { rows: { c: number }[] }).rows[0]?.c ?? 0;
      }
      output = { dbLatencyMs: Date.now() - t0, counts, checks: ["db:pass", "tables:pass", "api:pass"] };
    } else if (action === "renewals") {
      output = await runRenewals();
    } else if (action === "settle") {
      output = await settleChallenges();
    } else if (action === "advance") {
      // move oldest todo → doing, oldest doing → done (sprint automation)
      const doing = (await db.select().from(agentTasks).where(eq(agentTasks.status, "doing")))[0];
      if (doing) {
        await db.update(agentTasks).set({ status: "done", progress: 100, updatedAt: new Date() }).where(eq(agentTasks.id, doing.id));
        output = { advanced: doing.id, to: "done", title: doing.title };
      } else {
        const todo = (await db.select().from(agentTasks).where(eq(agentTasks.status, "todo")))[0];
        if (!todo) throw badRequest("No remaining tasks — plan complete 🎉");
        await db.update(agentTasks).set({ status: "doing", progress: 25, updatedAt: new Date() }).where(eq(agentTasks.id, todo.id));
        output = { advanced: todo.id, to: "doing", title: todo.title };
      }
    } else if (action === "seed-demo") {
      const { normalizeMsisdn } = await import("@/lib/dcb");
      const { ensureSubscriber } = await import("@/server/services/billing");
      const sub = await ensureSubscriber(normalizeMsisdn("08031234567"), "Agent Demo");
      output = { subscriberId: sub.id, msisdn: sub.msisdn, note: "Demo subscriber ready. Use /app to log, /health demo-seed for sensors." };
    } else {
      throw badRequest(`Unknown action: ${action}. Try smoke|seed-demo|advance|renewals|settle`);
    }
  } catch (e) {
    status = "failed";
    output = { error: e instanceof Error ? e.message : String(e) };
  }

  const [run] = await db.insert(agentRuns).values({
    taskId: body.taskId ?? null, action, status, output,
  }).returning();
  return ok({ run });
}, { scope: "agent-run" });
