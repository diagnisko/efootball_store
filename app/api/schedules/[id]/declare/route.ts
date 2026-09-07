import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const schedule = await prisma.paymentSchedule.findUnique({
    where: { id: params.id },
    include: { paymentPlan: { include: { purchase: true } } },
  });
  if (!schedule) {
    return NextResponse.json({ error: "Échéance introuvable." }, { status: 404 });
  }
  // Un client ne peut déclarer que le paiement de SES propres échéances.
  if (schedule.paymentPlan.purchase.userId !== userId) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }
  if (!["DUE", "LATE"].includes(schedule.status)) {
    return NextResponse.json(
      { error: "Cette échéance n'est pas déclarable dans son état actuel." },
      { status: 400 }
    );
  }

  const { reference, comment, proofUrl } = await req.json().catch(() => ({}));

  const [submission] = await prisma.$transaction([
    prisma.paymentSubmission.create({
      data: {
        paymentScheduleId: schedule.id,
        userId,
        reference: reference || null,
        comment: comment || null,
        proofUrl: proofUrl || null,
        status: "PENDING",
      },
    }),
    prisma.paymentSchedule.update({
      where: { id: schedule.id },
      data: { status: "AWAITING_VALIDATION" },
    }),
  ]);

  // Notifie les admins/managers ayant la capacité de confirmer les paiements.
  const reviewers = await prisma.user.findMany({
    where: { role: { name: { in: ["SUPER_ADMIN", "MANAGER"] } } },
    select: { id: true },
  });
  await prisma.notification.createMany({
    data: reviewers.map((r) => ({
      userId: r.id,
      type: "payment_declared",
      title: "Paiement déclaré",
      body: `Échéance n°${schedule.installmentNumber} déclarée, en attente de validation.`,
      link: `/manager/payments/${submission.id}`,
    })),
  });

  return NextResponse.json({ submissionId: submission.id }, { status: 201 });
}
