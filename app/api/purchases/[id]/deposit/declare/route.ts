import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const purchase = await prisma.purchase.findUnique({
    where: { id: params.id },
    include: { paymentPlan: true, product: true },
  });
  if (!purchase) return NextResponse.json({ error: "Achat introuvable." }, { status: 404 });
  if (purchase.userId !== userId) return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  if (!purchase.paymentPlan) return NextResponse.json({ error: "Plan de paiement introuvable." }, { status: 400 });
  if (!["PENDING", "REJECTED"].includes(purchase.paymentPlan.initialDepositStatus)) {
    return NextResponse.json(
      { error: "Votre apport initial a déjà été déclaré ou validé." },
      { status: 400 }
    );
  }

  const { reference, comment, proofUrl } = await req.json().catch(() => ({}));

  const [submission] = await prisma.$transaction([
    prisma.paymentSubmission.create({
      data: {
        paymentPlanId: purchase.paymentPlan.id,
        userId,
        reference: reference || null,
        comment: comment || null,
        proofUrl: proofUrl || null,
        status: "PENDING",
      },
    }),
    prisma.paymentPlan.update({
      where: { id: purchase.paymentPlan.id },
      data: { initialDepositStatus: "AWAITING_VALIDATION" },
    }),
  ]);

  const reviewers = await prisma.user.findMany({
    where: { role: { name: { in: ["SUPER_ADMIN", "MANAGER"] } } },
    select: { id: true },
  });
  await prisma.notification.createMany({
    data: reviewers.map((r) => ({
      userId: r.id,
      type: "deposit_declared",
      title: "Apport initial déclaré",
      body: `Apport initial déclaré pour "${purchase.product.title}", en attente de validation.`,
      link: `/manager/payments`,
    })),
  });

  return NextResponse.json({ submissionId: submission.id }, { status: 201 });
}
