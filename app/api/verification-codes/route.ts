import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Le client demande un code de vérification (2FA/OTP Konami reçu au premier login sur le
 * compte transféré) pour un de ses achats. Un manager/admin le fournira ensuite depuis
 * /manager/verification-codes. Voir le commentaire sur le modèle VerificationCodeRequest.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { purchaseId, note } = (await req.json().catch(() => ({}))) as { purchaseId?: string; note?: string };
  if (!purchaseId) return NextResponse.json({ error: "Achat manquant." }, { status: 400 });

  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase || purchase.userId !== userId) {
    return NextResponse.json({ error: "Achat introuvable." }, { status: 404 });
  }
  if (!["ACTIVE", "COMPLETED"].includes(purchase.status)) {
    return NextResponse.json({ error: "Cet achat n'est pas encore actif." }, { status: 400 });
  }

  const existing = await prisma.verificationCodeRequest.findFirst({
    where: { purchaseId, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json({ error: "Une demande est déjà en cours pour cet achat." }, { status: 409 });
  }

  const request = await prisma.verificationCodeRequest.create({
    data: { purchaseId, requestedBy: userId, note: note?.slice(0, 500) },
  });

  return NextResponse.json({ ok: true, request });
}
