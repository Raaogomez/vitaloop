import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { normalizeMsisdn, detectOperator } from "@/lib/dcb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const msisdn = searchParams.get("msisdn");
  if (msisdn) {
    const rows = await db.select().from(subscribers).where(eq(subscribers.msisdn, msisdn));
    return Response.json({ ok: true, subscriber: rows[0] ?? null });
  }
  const rows = await db.select().from(subscribers);
  return Response.json({ ok: true, subscribers: rows });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { msisdn: raw, displayName, ageBand, gender, goals, operator } = body as {
    msisdn: string; displayName?: string; ageBand?: string; gender?: string; goals?: string[]; operator?: string;
  };
  if (!raw) return Response.json({ ok: false, error: "msisdn required" }, { status: 400 });
  const msisdn = normalizeMsisdn(raw);
  const op = operator || detectOperator(msisdn);
  const existing = await db.select().from(subscribers).where(eq(subscribers.msisdn, msisdn));
  if (existing[0]) {
    return Response.json({ ok: true, subscriber: existing[0], created: false });
  }
  const [row] = await db
    .insert(subscribers)
    .values({ msisdn, operator: op, displayName: displayName || null, ageBand: ageBand || null, gender: gender || null, goals: goals || [] })
    .returning();
  return Response.json({ ok: true, subscriber: row, created: true });
}
