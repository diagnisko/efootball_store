import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCapability } from "@/lib/permissions";
import { presignPrivateDownload, StorageNotConfiguredError } from "@/lib/storage";
import { logAdminAction } from "@/lib/admin-log";

export async function GET(_req: Request, { params }: { params: { submissionId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const actorId = (session.user as { id: string }).id;
  const actorRole = (session.user as { role: string }).role;

  const canConfirm = await hasCapability(actorId, "confirm_payment");
  const canReject = await hasCapability(actorId, "reject_payment");
  if (!canConfirm && !canReject) {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const submission = await prisma.paymentSubmission.findUnique({ where: { id: params.submissionId } });
  if (!submission) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  if (!submission.proofUrl) {
    return NextResponse.json({ error: "Aucune preuve jointe à ce paiement." }, { status: 404 });
  }

  try {
    const signedUrl = await presignPrivateDownload(submission.proofUrl, 300);

    await logAdminAction({
      actorId,
      actorRole,
      action: "payment_proof.view",
      targetType: "payment_submission",
      targetId: submission.id,
    });

    return NextResponse.redirect(signedUrl);
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 501 });
    }
    return NextResponse.json({ error: "Impossible de générer le lien de consultation." }, { status: 500 });
  }
}
