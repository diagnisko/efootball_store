import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { logAdminAction } from "@/lib/admin-log";
import { sendEmail } from "@/lib/email";
import { verificationApprovedEmail, verificationRejectedEmail } from "@/lib/email-templates";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const actorId = (session.user as { id: string }).id;
  const actorRole = (session.user as { role: string }).role;

  const { decision, rejectionReason } = (await req.json().catch(() => ({}))) as {
    decision?: "approve" | "reject";
    rejectionReason?: string;
  };
  if (!decision || !["approve", "reject"].includes(decision)) {
    return NextResponse.json({ error: "Décision invalide." }, { status: 400 });
  }

  try {
    await requireCapability(actorId, decision === "approve" ? "verify_identity" : "reject_identity");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const request = await prisma.verificationRequest.findUnique({
    where: { id: params.id },
    include: { user: true },
  });
  if (!request) return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Ce dossier a déjà été traité." }, { status: 400 });
  }

  const newStatus = decision === "approve" ? "VERIFIED" : "REJECTED";

  await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { id: request.id },
      data: {
        status: decision === "approve" ? "CONFIRMED" : "REJECTED",
        reviewedBy: actorId,
        reviewedAt: new Date(),
        rejectionReason: decision === "reject" ? rejectionReason ?? null : null,
      },
    }),
    prisma.user.update({
      where: { id: request.userId },
      data: { verificationStatus: newStatus },
    }),
    prisma.notification.create({
      data: {
        userId: request.userId,
        type: decision === "approve" ? "verification_approved" : "verification_rejected",
        title: decision === "approve" ? "Identité vérifiée" : "Identité refusée",
        body:
          decision === "approve"
            ? "Votre identité a été validée. Vous pouvez désormais acheter."
            : `Votre dossier a été refusé.${rejectionReason ? " Motif : " + rejectionReason : ""}`,
      },
    }),
  ]);

  await logAdminAction({
    actorId,
    actorRole,
    action: decision === "approve" ? "verification.approve" : "verification.reject",
    targetType: "user",
    targetId: request.userId,
    oldValue: { verificationStatus: request.user.verificationStatus },
    newValue: { verificationStatus: newStatus },
  });

  await sendEmail({
    to: request.user.email,
    ...(decision === "approve"
      ? verificationApprovedEmail(request.user.firstName)
      : verificationRejectedEmail(request.user.firstName, rejectionReason)),
  });

  return NextResponse.json({ ok: true });
}
