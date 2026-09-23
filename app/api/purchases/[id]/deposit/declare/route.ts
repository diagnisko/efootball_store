import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { adminDepositDeclaredEmail } from "@/lib/email-templates";
import { getAdminNotificationRecipients } from "@/lib/admin-notifications";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const purchase = await prisma.purchase.findUnique({
    where: { id: params.id },
    include: { paymentPlan: true, product: true, user: true },
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

  let submission;
  try {
    submission = await prisma.$transaction(async (tx) => {
      const lockedProduct = await tx.product.updateMany({
        where: { id: purchase.productId, status: "AVAILABLE" },
        data: { status: "IN_PROGRESS" },
      });
      if (lockedProduct.count !== 1) throw new Error("OFFER_NO_LONGER_AVAILABLE");

      const createdSubmission = await tx.paymentSubmission.create({
        data: {
          paymentPlanId: purchase.paymentPlan!.id,
          userId,
          reference: reference || null,
          comment: comment || null,
          proofUrl: proofUrl || null,
          status: "PENDING",
        },
      });
      await tx.paymentPlan.update({
        where: { id: purchase.paymentPlan!.id },
        data: { initialDepositStatus: "AWAITING_VALIDATION" },
      });
      return createdSubmission;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "OFFER_NO_LONGER_AVAILABLE") {
      return NextResponse.json(
        { error: "Cette offre a déjà reçu un apport d'un autre client." },
        { status: 409 }
      );
    }
    throw error;
  }

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

  const adminRecipients = await getAdminNotificationRecipients();
  if (adminRecipients.length > 0) {
    await sendEmail({
      to: adminRecipients,
      ...adminDepositDeclaredEmail(
        purchase.user.firstName,
        purchase.user.lastName,
        purchase.user.email,
        purchase.product.title,
        Number(purchase.paymentPlan.initialDepositAmount),
        submission.reference
      ),
    });
  }

  return NextResponse.json({ submissionId: submission.id }, { status: 201 });
}
