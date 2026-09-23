import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { logAdminAction } from "@/lib/admin-log";
import { sendEmail } from "@/lib/email";
import { contractCancelledEmail } from "@/lib/email-templates";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const actorId = (session.user as { id: string }).id;
  const actorRole = (session.user as { role: string }).role;
  try {
    await requireCapability(actorId, "cancel_contract");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { reason?: string; password?: string };
  if (!body.password) return NextResponse.json({ error: "Mot de passe administrateur requis." }, { status: 400 });
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { passwordHash: true } });
  if (!actor?.passwordHash || !(await bcrypt.compare(body.password, actor.passwordHash))) {
    return NextResponse.json({ error: "Mot de passe administrateur incorrect." }, { status: 400 });
  }
  const reason = body.reason?.trim() || null;
  const purchase = await prisma.purchase.findUnique({
    where: { id: params.id },
    include: { user: true, product: true, paymentPlan: true },
  });
  if (!purchase) return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });
  if (purchase.status === "CANCELLED") return NextResponse.json({ ok: true, alreadyCancelled: true });

  await prisma.$transaction([
    prisma.purchase.update({ where: { id: purchase.id }, data: { status: "CANCELLED" } }),
    ...(purchase.paymentPlan
      ? [prisma.paymentPlan.update({ where: { id: purchase.paymentPlan.id }, data: { status: "CANCELLED" } })]
      : []),
    prisma.product.update({ where: { id: purchase.productId }, data: { status: "AVAILABLE" } }),
    prisma.notification.create({
      data: {
        userId: purchase.userId,
        type: "contract_cancelled",
        title: "Contrat annulé",
        body: reason ? `Votre achat "${purchase.product.title}" a été annulé. Motif : ${reason}` : `Votre achat "${purchase.product.title}" a été annulé.`,
      },
    }),
  ]);

  await logAdminAction({
    actorId,
    actorRole,
    action: "contract.cancel",
    targetType: "purchase",
    targetId: purchase.id,
    oldValue: { status: purchase.status },
    newValue: { status: "CANCELLED", reason },
  });
  await sendEmail({ to: purchase.user.email, ...contractCancelledEmail(purchase.user.firstName, purchase.product.title, reason) });

  return NextResponse.json({ ok: true });
}