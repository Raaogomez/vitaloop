import { db } from "@/db";
import { wellnessActivities, dcbPlans, challenges, healthTips } from "@/db/schema";
import { ACTIVITY_CATALOG, PLAN_CATALOG, CHALLENGE_CATALOG, TIPS_CATALOG } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await db.delete(healthTips);
    await db.delete(challenges);
    await db.delete(dcbPlans);
    await db.delete(wellnessActivities);

    await db.insert(wellnessActivities).values(ACTIVITY_CATALOG);
    await db.insert(dcbPlans).values(PLAN_CATALOG);
    await db.insert(challenges).values(CHALLENGE_CATALOG);
    await db.insert(healthTips).values(TIPS_CATALOG);

    return Response.json({
      ok: true,
      seeded: {
        activities: ACTIVITY_CATALOG.length,
        plans: PLAN_CATALOG.length,
        challenges: CHALLENGE_CATALOG.length,
        tips: TIPS_CATALOG.length,
      },
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
