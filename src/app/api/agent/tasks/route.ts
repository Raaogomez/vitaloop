import { db } from "@/db";
import { agentTasks } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { withApi, readJson } from "@/server/http";
import { ok, badRequest } from "@/server/errors";
import { BUILD_TASKS, BUILD_PHASES } from "@/server/buildPlan";
import { agentTaskPatch, parseOrThrow } from "@/server/validation";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const rows = await db.select().from(agentTasks).orderBy(asc(agentTasks.sort));
  const done = rows.filter((r) => r.status === "done").length;
  return ok({
    phases: BUILD_PHASES,
    tasks: rows,
    progress: rows.length ? Math.round((done / rows.length) * 100) : 0,
    seeded: rows.length > 0,
  });
}, { scope: "agent-tasks" });

// Seed (or reseed) the build plan
export const POST = withApi(async () => {
  const existing = await db.select().from(agentTasks);
  if (existing.length) return ok({ seeded: false, count: existing.length, note: "Plan already seeded. DELETE to reset." });
  for (const t of BUILD_TASKS) {
    await db.insert(agentTasks).values({
      phase: t.phase, title: t.title, detail: t.detail,
      status: "todo", progress: 0, owner: "agent", sort: t.sort,
    });
  }
  // mark foundation as done — it shipped with this release
  const rows = await db.select().from(agentTasks);
  for (const r of rows.filter((x) => x.phase === "foundation")) {
    await db.update(agentTasks).set({ status: "done", progress: 100 }).where(eq(agentTasks.id, r.id));
  }
  return ok({ seeded: true, count: BUILD_TASKS.length });
}, { scope: "agent-tasks" });

export const PATCH = withApi(async ({ req, url }) => {
  const id = Number(url.searchParams.get("id"));
  if (!id) throw badRequest("task id required (?id=)");
  const patch = parseOrThrow(agentTaskPatch, await readJson(req));
  await db.update(agentTasks).set({ ...patch, updatedAt: new Date() }).where(eq(agentTasks.id, id));
  const [row] = await db.select().from(agentTasks).where(eq(agentTasks.id, id));
  return ok({ task: row });
}, { scope: "agent-tasks" });

export const DELETE = withApi(async () => {
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`delete from agent_tasks`);
  await db.execute(sql`delete from agent_runs`);
  return ok({ reset: true });
}, { scope: "agent-tasks" });
