import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = (await req.json().catch(() => ({}))) as {
    scheduleIds?: string[];
    reference?: string;
    comment?: string;
    proofUrl?: string | null;
  };
  const scheduleIds = [...new Set(body.scheduleIds ?? [])];
  if (scheduleIds.length < 2) return NextResponse.json({ error: "Sélectionnez au moins deux échéances." }, { status: 400 });

  const schedules = await prisma.paymentSchedule.findMany({
    where: { id: { in: scheduleIds }, paymentPlan: { purchase: { userId } } },
    include: { paymentPlan: { include: { purchase: true } } },
    orderBy: { installmentNumber: "asc" },
  });
  if (schedules.length !== scheduleIds.length) return NextResponse.json({ error: "Échéance non autorisée." }, { status: 403 });
  const planIds = new Set(schedules.map((schedule) => schedule.paymentPlanId));
  if (planIds.size !== 1) return NextResponse.json({ error: "Les échéances doivent appartenir au même achat." }, { status: 400 });
  const firstPayable = schedules[0];
  if (!["DUE", "LATE", "UPCOMING"].includes(firstPayable.status)) return NextResponse.json({ error: "Aucune échéance payable sélectionnée." }, { status: 400 });
  for (let index = 1; index < schedules.length; index += 1) {
    if (schedules[index].installmentNumber !== schedules[index - 1].installmentNumber + 1) {
      return NextResponse.json({ error: "Les échéances doivent se suivre." }, { status: 400 });
    }
    if (!["DUE", "LATE", "UPCOMING"].includes(schedules[index].status)) {
      return NextResponse.json({ error: "Une échéance sélectionnée n'est pas disponible." }, { status: 400 });
    }
  }

  const submissionData = schedules.map((schedule) => ({
    paymentScheduleId: schedule.id,
    userId,
    reference: body.reference || null,
    comment: body.comment || null,
    proofUrl: body.proofUrl || null,
    status: "PENDING" as const,
  }));
  const submissions = await prisma.$transaction([
    prisma.paymentSubmission.createMany({ data: submissionData }),
    ...schedules.map((schedule) => prisma.paymentSchedule.update({ where: { id: schedule.id }, data: { status: "AWAITING_VALIDATION" } })),
  ]);

  const reviewers = await prisma.user.findMany({ where: { role: { name: { in: ["SUPER_ADMIN", "MANAGER"] } } }, select: { id: true } });
  await prisma.notification.createMany({
    data: reviewers.map((reviewer) => ({
      userId: reviewer.id,
      type: "payment_declared",
      title: "Paiements groupés déclarés",
      body: `${schedules.length} échéances ont été déclarées, en attente de validation.`,
      link: "/manager/payments",
    })),
  });

  return NextResponse.json({ count: schedules.length, result: submissions }, { status: 201 });
}