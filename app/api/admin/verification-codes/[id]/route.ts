import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { logAdminAction } from "@/lib/admin-log";
import { sendEmail } from "@/lib/email";
import { verificationCodeProvidedEmail } from "@/lib/email-templates";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const actorId = (session.user as { id: string }).id;
  const actorRole = (session.user as { role: string }).role;

  const { decision, code } = (await req.json().catch(() => ({}))) as {
    decision?: "provide" | "cancel";
    code?: string;
  };
  if (!decision || !["provide", "cancel"].includes(decision)) {
    return NextResponse.json({ error: "Décision invalide." }, { status: 400 });
  }
  if (decision === "provide" && !code?.trim()) {
    return NextResponse.json({ error: "Le code est requis." }, { status: 400 });
  }

  // Même niveau de confiance que la transmission des identifiants du compte : réutilise
  // la capacité "send_access_info" plutôt que d'en créer une dédiée pour un seul cas d'usage.
  try {
    await requireCapability(actorId, "send_access_info");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const request = await prisma.verificationCodeRequest.findUnique({
    where: { id: params.id },
    include: { purchase: { include: { user: true, product: true } } },
  });
  if (!request) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.verificationCodeRequest.update({
      where: { id: request.id },
      data: {
        status: decision === "provide" ? "PROVIDED" : "CANCELLED",
        code: decision === "provide" ? code!.trim() : null,
        providedBy: actorId,
        respondedAt: new Date(),
      },
    }),
    ...(decision === "provide"
      ? [
          prisma.notification.create({
            data: {
              userId: request.purchase.userId,
              type: "verification_code_provided",
              title: "Code de vérification disponible",
              body: `Le code de vérification pour "${request.purchase.product.title}" est disponible dans votre espace.`,
            },
          }),
        ]
      : []),
  ]);

  await logAdminAction({
    actorId,
    actorRole,
    action: decision === "provide" ? "verification_code.provide" : "verification_code.cancel",
    targetType: "purchase",
    targetId: request.purchaseId,
    oldValue: { status: "PENDING" },
    newValue: { status: decision === "provide" ? "PROVIDED" : "CANCELLED" },
  });

  if (decision === "provide") {
    await sendEmail({
      to: request.purchase.user.email,
      ...verificationCodeProvidedEmail(request.purchase.user.firstName, request.purchase.product.title, code?.trim() || request.code),
    });
  }

  return NextResponse.json({ ok: true });
}
