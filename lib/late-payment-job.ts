import { prisma } from "./prisma";
import { logAdminAction } from "./admin-log";
import { sendEmail } from "./email";
import {
  paymentReminderEmail,
  latePaymentEmail,
  accountSuspendedEmail,
  contractCancelledEmail,
} from "./email-templates";

export interface LateJobSummary {
  remindersSent: number;
  newlyLate: number;
  suspended: number;
  cancelled: number;
  errors: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / DAY_MS);

/**
 * Job quotidien (section 21 du cahier des charges). Trois responsabilités :
 *  1. Rappeler les échéances qui approchent (J-3 et J-1).
 *  2. Détecter les échéances dépassant le délai de grâce, calculer et appliquer la pénalité.
 *  3. Faire progresser les échéances déjà en retard vers la suspension puis l'annulation,
 *     selon les seuils configurés par le Super Admin (table LatePaymentRule).
 *
 * Limite connue : ce job est conçu pour tourner une fois par jour (cron). L'exécuter plusieurs
 * fois le même jour peut renvoyer des rappels en double — il n'y a pas de déduplication par
 * date ici. En production, un job runner avec verrou (ou un simple flag "reminderSentAt" sur
 * l'échéance) réglerait ça proprement.
 */
export async function runLatePaymentJob(): Promise<LateJobSummary> {
  const summary: LateJobSummary = { remindersSent: 0, newlyLate: 0, suspended: 0, cancelled: 0, errors: [] };

  const rule = await prisma.latePaymentRule.findFirst();
  if (!rule) {
    summary.errors.push("Aucune règle de retard configurée (LatePaymentRule) — job ignoré.");
    return summary;
  }

  // Acteur technique pour le journal d'audit : la contrainte de schéma exige un utilisateur
  // réel (FK non nullable). On utilise le premier Super Admin comme porteur de l'action, avec
  // actorRole="SYSTEM" pour distinguer clairement une action automatique dans les logs.
  const systemActor = await prisma.user.findFirst({ where: { role: { name: "SUPER_ADMIN" } } });

  const now = new Date();

  // ---------- 1. Rappels J-3 / J-1 ----------
  const dueSoon = await prisma.paymentSchedule.findMany({
    where: { status: "DUE" },
    include: { paymentPlan: { include: { purchase: { include: { user: true, product: true } } } } },
  });

  for (const s of dueSoon) {
    const diffDays = daysBetween(s.dueDate, now) * -1; // positif si l'échéance est encore à venir
    if (diffDays === 3 || diffDays === 1) {
      await prisma.notification.create({
        data: {
          userId: s.paymentPlan.purchase.userId,
          type: "payment_reminder",
          title: "Échéance à venir",
          body: `Votre échéance n°${s.installmentNumber} (${Number(s.amount).toLocaleString("fr-FR")} FCFA) est due dans ${diffDays} jour${diffDays > 1 ? "s" : ""}.`,
          link: "/dashboard",
        },
      });
      await sendEmail({
        to: s.paymentPlan.purchase.user.email,
        ...paymentReminderEmail(s.paymentPlan.purchase.user.firstName, s.installmentNumber, Number(s.amount), diffDays),
      });
      summary.remindersSent++;
    }
  }

  // ---------- 2. Passage en retard + calcul de la pénalité ----------
  const graceMs = rule.gracePeriodDays * DAY_MS;
  const overdue = dueSoon.filter((s) => now.getTime() - s.dueDate.getTime() > graceMs);

  for (const s of overdue) {
    const daysLate = daysBetween(now, s.dueDate);
    const penaltyAmount =
      rule.penaltyType === "FIXED"
        ? Number(rule.penaltyValue)
        : Math.round((Number(s.amount) * Number(rule.penaltyValue)) / 100);

    await prisma.paymentSchedule.update({
      where: { id: s.id },
      data: { status: "PENALIZED", daysLate, penaltyAmount },
    });

    await prisma.notification.create({
      data: {
        userId: s.paymentPlan.purchase.userId,
        type: "late_payment",
        title: "Paiement en retard",
        body: `Votre échéance n°${s.installmentNumber} est en retard de ${daysLate} jour${daysLate > 1 ? "s" : ""}. Une pénalité de ${penaltyAmount.toLocaleString("fr-FR")} FCFA a été appliquée.`,
        link: "/dashboard",
      },
    });

    await sendEmail({
      to: s.paymentPlan.purchase.user.email,
      ...latePaymentEmail(s.paymentPlan.purchase.user.firstName, s.installmentNumber, daysLate, penaltyAmount),
    });

    const reviewers = await prisma.user.findMany({
      where: { role: { name: { in: ["SUPER_ADMIN", "MANAGER"] } } },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: reviewers.map((r) => ({
        userId: r.id,
        type: "late_payment",
        title: "Paiement en retard détecté",
        body: `${s.paymentPlan.purchase.user.firstName} ${s.paymentPlan.purchase.user.lastName} — échéance n°${s.installmentNumber} en retard de ${daysLate} jours.`,
        link: "/manager/payments",
      })),
    });

    summary.newlyLate++;
  }

  // ---------- 3. Escalade des retards déjà connus (suspension / annulation) ----------
  const alreadyLate = await prisma.paymentSchedule.findMany({
    where: { status: { in: ["LATE", "PENALIZED"] } },
    include: {
      paymentPlan: { include: { purchase: { include: { user: true, product: true } } } },
    },
  });

  for (const s of alreadyLate) {
    const daysLate = daysBetween(now, s.dueDate);
    if (daysLate !== s.daysLate) {
      await prisma.paymentSchedule.update({ where: { id: s.id }, data: { daysLate } });
    }

    const user = s.paymentPlan.purchase.user;
    const purchase = s.paymentPlan.purchase;

    try {
      if (daysLate >= rule.maxLateDaysBeforeCancellation && purchase.status !== "CANCELLED") {
        await prisma.$transaction([
          prisma.purchase.update({ where: { id: purchase.id }, data: { status: "CANCELLED" } }),
          prisma.paymentPlan.update({ where: { id: s.paymentPlanId }, data: { status: "CANCELLED" } }),
          prisma.product.update({ where: { id: purchase.productId }, data: { status: "AVAILABLE" } }),
          prisma.notification.create({
            data: {
              userId: user.id,
              type: "contract_cancelled",
              title: "Contrat annulé",
              body: `Votre achat "${purchase.product.title}" a été annulé suite à un retard de paiement dépassant ${rule.maxLateDaysBeforeCancellation} jours.`,
            },
          }),
        ]);
        await sendEmail({ to: user.email, ...contractCancelledEmail(user.firstName, purchase.product.title) });
        if (systemActor) {
          await logAdminAction({
            actorId: systemActor.id,
            actorRole: "SYSTEM",
            action: "contract.auto_cancel",
            targetType: "purchase",
            targetId: purchase.id,
            newValue: { reason: "late_payment_threshold", daysLate },
          });
        }
        summary.cancelled++;
      } else if (daysLate >= rule.maxLateDaysBeforeSuspension && user.accountStatus === "ACTIVE") {
        await prisma.$transaction([
          prisma.user.update({ where: { id: user.id }, data: { accountStatus: "SUSPENDED" } }),
          prisma.notification.create({
            data: {
              userId: user.id,
              type: "account_suspended",
              title: "Compte suspendu",
              body: `Votre compte a été suspendu suite à un retard de paiement dépassant ${rule.maxLateDaysBeforeSuspension} jours. Contactez le support.`,
            },
          }),
        ]);
        await sendEmail({
          to: user.email,
          ...accountSuspendedEmail(user.firstName, `retard de paiement dépassant ${rule.maxLateDaysBeforeSuspension} jours`),
        });
        if (systemActor) {
          await logAdminAction({
            actorId: systemActor.id,
            actorRole: "SYSTEM",
            action: "user.auto_suspend",
            targetType: "user",
            targetId: user.id,
            newValue: { reason: "late_payment_threshold", daysLate },
          });
        }
        summary.suspended++;
      }
    } catch (e) {
      summary.errors.push(`Échéance ${s.id}: ${e instanceof Error ? e.message : "erreur inconnue"}`);
    }
  }

  return summary;
}
