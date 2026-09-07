import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { logAdminAction } from "@/lib/admin-log";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const actorId = (session.user as { id: string }).id;
  const actorRole = (session.user as { role: string }).role;

  try {
    await requireCapability(actorId, "delete_client");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password) return NextResponse.json({ error: "Mot de passe administrateur requis." }, { status: 400 });

  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor?.passwordHash || !(await bcrypt.compare(password, actor.passwordHash))) {
    return NextResponse.json({ error: "Mot de passe administrateur incorrect." }, { status: 400 });
  }

  const client = await prisma.user.findUnique({ where: { id: params.id }, include: { role: true } });
  if (!client || client.role.name !== "CLIENT") {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    const purchases = await tx.purchase.findMany({ where: { userId: client.id }, select: { id: true } });
    const purchaseIds = purchases.map((purchase) => purchase.id);
    const plans = await tx.paymentPlan.findMany({ where: { purchaseId: { in: purchaseIds } }, select: { id: true } });
    const planIds = plans.map((plan) => plan.id);
    const schedules = await tx.paymentSchedule.findMany({ where: { paymentPlanId: { in: planIds } }, select: { id: true } });
    const scheduleIds = schedules.map((schedule) => schedule.id);
    const submissions = await tx.paymentSubmission.findMany({
      where: { OR: [{ userId: client.id }, { paymentPlanId: { in: planIds } }, { paymentScheduleId: { in: scheduleIds } }] },
      select: { id: true },
    });
    const submissionIds = submissions.map((submission) => submission.id);

    await tx.paymentConfirmation.deleteMany({ where: { OR: [{ paymentSubmissionId: { in: submissionIds } }, { reviewedBy: client.id }] } });
    await tx.paymentSubmission.deleteMany({ where: { id: { in: submissionIds } } });
    await tx.paymentSchedule.deleteMany({ where: { id: { in: scheduleIds } } });
    await tx.paymentPlan.deleteMany({ where: { id: { in: planIds } } });
    await tx.accessInformation.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
    await tx.verificationCodeRequest.deleteMany({ where: { OR: [{ purchaseId: { in: purchaseIds } }, { requestedBy: client.id }, { providedBy: client.id }] } });
    await tx.purchase.deleteMany({ where: { id: { in: purchaseIds } } });
    await tx.message.deleteMany({ where: { senderId: client.id } });
    await tx.conversation.deleteMany({ where: { clientId: client.id } });
    await tx.conversation.updateMany({ where: { assignedTo: client.id }, data: { assignedTo: null } });
    await tx.identityDocument.deleteMany({ where: { OR: [{ userId: client.id }, { reviewedBy: client.id }] } });
    await tx.verificationRequest.deleteMany({ where: { OR: [{ userId: client.id }, { reviewedBy: client.id }] } });
    await tx.notification.deleteMany({ where: { userId: client.id } });
    await tx.passwordResetToken.deleteMany({ where: { userId: client.id } });
    await tx.clientNote.deleteMany({ where: { OR: [{ clientId: client.id }, { authorId: client.id }] } });
    await tx.managerPermission.deleteMany({ where: { OR: [{ userId: client.id }, { grantedBy: client.id }] } });
    await tx.adminLog.deleteMany({ where: { actorId: client.id } });
    await tx.user.delete({ where: { id: client.id } });
  });

  await logAdminAction({
    actorId,
    actorRole,
    action: "client.delete",
    targetType: "user",
    targetId: client.id,
    oldValue: { email: client.email, firstName: client.firstName, lastName: client.lastName },
  });

  return NextResponse.json({ ok: true });
}