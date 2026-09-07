import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-log";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const actorId = (session?.user as { id?: string } | undefined)?.id;
  const actorRole = (session?.user as { role?: string } | undefined)?.role;
  if (!actorId || actorRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Réservé au Super Admin." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    gracePeriodDays?: number;
    penaltyType?: "FIXED" | "PERCENTAGE";
    penaltyValue?: number;
    maxLateDaysBeforeSuspension?: number;
    maxLateDaysBeforeCancellation?: number;
  };

  const existing = await prisma.latePaymentRule.findFirst();

  const data = {
    gracePeriodDays: body.gracePeriodDays ?? existing?.gracePeriodDays ?? 3,
    penaltyType: body.penaltyType ?? existing?.penaltyType ?? "PERCENTAGE",
    penaltyValue: body.penaltyValue ?? existing?.penaltyValue ?? 5,
    maxLateDaysBeforeSuspension: body.maxLateDaysBeforeSuspension ?? existing?.maxLateDaysBeforeSuspension ?? 15,
    maxLateDaysBeforeCancellation: body.maxLateDaysBeforeCancellation ?? existing?.maxLateDaysBeforeCancellation ?? 45,
    updatedBy: actorId,
  };

  const rule = existing
    ? await prisma.latePaymentRule.update({ where: { id: existing.id }, data })
    : await prisma.latePaymentRule.create({ data });

  await logAdminAction({
    actorId,
    actorRole,
    action: "late_rules.update",
    targetType: "platform_setting",
    targetId: rule.id,
    oldValue: existing ?? undefined,
    newValue: data,
  });

  return NextResponse.json({ ok: true });
}
