import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { logAdminAction } from "@/lib/admin-log";
import type { Prisma } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import {
  depositConfirmedEmail,
  depositRejectedEmail,
  installmentConfirmedEmail,
  installmentRejectedEmail,
} from "@/lib/email-templates";

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function PATCH(req: Request, { params }: { params: { submissionId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const actorId = (session.user as { id: string }).id;
  const actorRole = (session.user as { role: string }).role;

  const { decision, note } = (await req.json().catch(() => ({}))) as {
    decision?: "confirm" | "reject" | "info_requested";
    note?: string;
  };
  if (!decision || !["confirm", "reject", "info_requested"].includes(decision)) {
    return NextResponse.json({ error: "Décision invalide." }, { status: 400 });
  }

  try {
    await requireCapability(actorId, decision === "confirm" ? "confirm_payment" : "reject_payment");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const submission = await prisma.paymentSubmission.findUnique({
    where: { id: params.submissionId },
    include: {
      user: true,
      paymentSchedule: true,
      paymentPlan: { include: { purchase: { include: { product: true } } } },
    },
  });
  if (!submission) return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
  if (submission.status !== "PENDING") {
    return NextResponse.json({ error: "Ce paiement a déjà été traité." }, { status: 400 });
  }

  const isDeposit = !submission.paymentScheduleId && !!submission.paymentPlanId;

  const confirmationDecision =
    decision === "confirm" ? "CONFIRMED" : decision === "reject" ? "REJECTED" : "INFO_REQUESTED";

  const submissionStatus =
    decision === "confirm" ? "CONFIRMED" : decision === "reject" ? "REJECTED" : "INFO_REQUESTED";

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.paymentConfirmation.create({
      data: {
        paymentSubmissionId: submission.id,
        reviewedBy: actorId,
        decision: confirmationDecision,
        note: note ?? null,
      },
    }),
    prisma.paymentSubmission.update({
      where: { id: submission.id },
      data: { status: submissionStatus },
    }),
  ];

  let notifTitle = "";
  let notifBody = "";
  let notifUserId = submission.userId;

  if (isDeposit && submission.paymentPlan) {
    const plan = submission.paymentPlan;
    const purchase = plan.purchase;

    if (decision === "confirm") {
      const startDate = new Date();
      const monthlyAmount = Number(plan.remainingAmount) / plan.installmentsCount;

      ops.push(
        prisma.paymentPlan.update({
          where: { id: plan.id },
          data: { initialDepositStatus: "PAID", status: "ACTIVE", startDate },
        }),
        prisma.purchase.update({ where: { id: purchase.id }, data: { status: "ACTIVE" } }),
        prisma.product.update({ where: { id: purchase.productId }, data: { status: "IN_PROGRESS" } })
      );

      for (let i = 1; i <= plan.installmentsCount; i++) {
        ops.push(
          prisma.paymentSchedule.create({
            data: {
              paymentPlanId: plan.id,
              installmentNumber: i,
              dueDate: addMonths(startDate, i),
              amount: monthlyAmount,
              status: i === 1 ? "DUE" : "UPCOMING",
            },
          })
        );
      }
      notifTitle = "Apport initial validé";
      notifBody = "Votre apport initial a été confirmé. Votre plan de paiement sur 8 mois est maintenant actif.";
    } else if (decision === "reject") {
      ops.push(
        prisma.paymentPlan.update({ where: { id: plan.id }, data: { initialDepositStatus: "REJECTED" } })
      );
      notifTitle = "Apport initial refusé";
      notifBody = note ? `Votre apport initial a été refusé. Motif : ${note}` : "Votre apport initial a été refusé.";
    } else {
      ops.push(
        prisma.paymentPlan.update({ where: { id: plan.id }, data: { initialDepositStatus: "PENDING" } })
      );
      notifTitle = "Informations complémentaires requises";
      notifBody = note ?? "Merci de fournir des informations complémentaires sur votre apport initial.";
    }
  } else if (submission.paymentSchedule) {
    const schedule = submission.paymentSchedule;

    if (decision === "confirm") {
      ops.push(
        prisma.paymentSchedule.update({
          where: { id: schedule.id },
          data: { status: "PAID", paidAt: new Date() },
        })
      );

      const plan = await prisma.paymentPlan.findUnique({
        where: { id: schedule.paymentPlanId },
        include: { schedules: true, purchase: true },
      });

      if (plan) {
        const remaining = Number(plan.remainingAmount) - Number(schedule.amount);
        ops.push(
          prisma.paymentPlan.update({ where: { id: plan.id }, data: { remainingAmount: remaining } })
        );

        const isLastInstallment = schedule.installmentNumber === plan.installmentsCount;
        if (isLastInstallment) {
          ops.push(
            prisma.paymentPlan.update({ where: { id: plan.id }, data: { status: "COMPLETED" } }),
            prisma.purchase.update({ where: { id: plan.purchaseId }, data: { status: "COMPLETED" } }),
            prisma.product.update({ where: { id: plan.purchase.productId }, data: { status: "SOLD" } })
          );
        } else {
          const next = plan.schedules.find(
            (s) => s.installmentNumber === schedule.installmentNumber + 1
          );
          if (next && next.status === "UPCOMING") {
            ops.push(prisma.paymentSchedule.update({ where: { id: next.id }, data: { status: "DUE" } }));
          }
        }
      }
      notifTitle = "Paiement confirmé";
      notifBody = `Votre échéance n°${schedule.installmentNumber} a été validée.`;
    } else if (decision === "reject") {
      ops.push(
        prisma.paymentSchedule.update({
          where: { id: schedule.id },
          data: { status: schedule.status === "LATE" ? "LATE" : "DUE" },
        })
      );
      notifTitle = "Paiement refusé";
      notifBody = note
        ? `Votre échéance n°${schedule.installmentNumber} a été refusée. Motif : ${note}`
        : `Votre échéance n°${schedule.installmentNumber} a été refusée.`;
    } else {
      ops.push(
        prisma.paymentSchedule.update({
          where: { id: schedule.id },
          data: { status: schedule.status === "LATE" ? "LATE" : "DUE" },
        })
      );
      notifTitle = "Informations complémentaires requises";
      notifBody = note ?? `Merci de préciser votre paiement pour l'échéance n°${schedule.installmentNumber}.`;
    }
  }

  ops.push(
    prisma.notification.create({
      data: { userId: notifUserId, type: "payment_" + decision, title: notifTitle, body: notifBody },
    })
  );

  await prisma.$transaction(ops);

  await logAdminAction({
    actorId,
    actorRole,
    action: `payment.${decision}`,
    targetType: isDeposit ? "payment_plan" : "payment_schedule",
    targetId: isDeposit ? submission.paymentPlanId! : submission.paymentScheduleId!,
    newValue: { decision, note: note ?? null },
  });

  // L'exemple donné en section 17 du cahier des charges est précisément celui-ci : après
  // validation de l'apport initial, le client reçoit un email. On ne va pas plus loin pour
  // "info_requested" côté email (la notification in-app suffit pour ce cas mineur).
  if (decision !== "info_requested") {
    if (isDeposit) {
      await sendEmail({
        to: submission.user.email,
        ...(decision === "confirm"
          ? depositConfirmedEmail(submission.user.firstName, submission.paymentPlan!.purchase.product.title)
          : depositRejectedEmail(submission.user.firstName, note)),
      });
    } else if (submission.paymentSchedule) {
      await sendEmail({
        to: submission.user.email,
        ...(decision === "confirm"
          ? installmentConfirmedEmail(submission.user.firstName, submission.paymentSchedule.installmentNumber)
          : installmentRejectedEmail(submission.user.firstName, submission.paymentSchedule.installmentNumber, note)),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
