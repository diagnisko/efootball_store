import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  if (user.verificationStatus !== "VERIFIED") {
    return NextResponse.json(
      { error: "Votre identité doit être vérifiée avant tout achat." },
      { status: 403 }
    );
  }

  const product = await prisma.product.findUnique({ where: { slug: params.slug } });
  if (!product) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
  if (product.status !== "AVAILABLE") {
    return NextResponse.json({ error: "Cette offre n'est plus disponible." }, { status: 409 });
  }

  // Note de conception : on verrouille l'offre (passage en IN_PROGRESS) dès la création de
  // l'achat plutôt que d'attendre la confirmation de l'apport initial par l'admin. Attendre
  // laisserait une fenêtre pendant laquelle deux clients pourraient réserver la même offre en
  // parallèle. La confirmation de l'apport initial reste, elle, le déclencheur qui active
  // réellement le plan de paiement (voir /api/admin/payments/[submissionId]).
  const result = await prisma.$transaction(async (tx) => {
    const stillAvailable = await tx.product.findUnique({ where: { id: product.id } });
    if (!stillAvailable || stillAvailable.status !== "AVAILABLE") {
      throw new Error("RACE_CONDITION");
    }

    const purchase = await tx.purchase.create({
      data: {
        userId,
        productId: product.id,
        status: "AWAITING_DEPOSIT",
        totalPrice: product.priceTotal,
      },
    });

    const plan = await tx.paymentPlan.create({
      data: {
        purchaseId: purchase.id,
        initialDepositAmount: product.initialDepositAmount,
        initialDepositStatus: "PENDING",
        remainingAmount: Number(product.priceTotal) - Number(product.initialDepositAmount),
        installmentsCount: product.installmentsCount,
        status: "PENDING_DEPOSIT",
      },
    });

    await tx.product.update({ where: { id: product.id }, data: { status: "IN_PROGRESS" } });

    return { purchase, plan };
  }).catch((e) => {
    if (e instanceof Error && e.message === "RACE_CONDITION") return null;
    throw e;
  });

  if (!result) {
    return NextResponse.json(
      { error: "Cette offre vient d'être réservée par un autre client." },
      { status: 409 }
    );
  }

  await prisma.notification.create({
    data: {
      userId,
      type: "purchase_initiated",
      title: "Achat initié",
      body: `Votre réservation pour "${product.title}" est enregistrée. Déclarez votre apport initial pour l'activer.`,
    },
  });

  return NextResponse.json({ purchaseId: result.purchase.id }, { status: 201 });
}
