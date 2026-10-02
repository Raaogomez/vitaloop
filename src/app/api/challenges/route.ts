import { db } from "@/db";
import { challenges, challengeEnrollments } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(challenges);
  return Response.json({ ok: true, challenges: rows });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { challengeId, subscriberId } = body as { challengeId: number; subscriberId: number };
  if (!challengeId || !subscriberId) {
    return Response.json({ ok: false, error: "challengeId and subscriberId required" }, { status: 400 });
  }
  const existing = await db
    .select()
    .from(challengeEnrollments)
    .where(eq(challengeEnrollments.subscriberId, subscriberId));
  const already = existing.find((e) => e.challengeId === challengeId);
  if (already) return Response.json({ ok: true, enrollment: already, alreadyJoined: true });

  const [row] = await db.insert(challengeEnrollments).values({ challengeId, subscriberId, progress: 0 }).returning();
  const [ch] = await db.select().from(challenges).where(eq(challenges.id, challengeId));
  if (ch) {
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`update challenges set participants = participants + 1 where id = ${challengeId}`);
  }
  return Response.json({ ok: true, enrollment: row });
}
