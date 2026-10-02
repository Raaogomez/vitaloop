import { db } from "@/db";
import { dcbTransactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const msisdn = searchParams.get("msisdn");
  const q = msisdn
    ? await db.select().from(dcbTransactions).where(eq(dcbTransactions.msisdn, msisdn)).orderBy(desc(dcbTransactions.createdAt))
    : await db.select().from(dcbTransactions).orderBy(desc(dcbTransactions.createdAt));
  return Response.json({ ok: true, transactions: q.slice(0, 100) });
}
