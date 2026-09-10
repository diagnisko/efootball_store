import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AccessInfoManager } from "@/components/AccessInfoManager";

export default async function AdminPurchaseDetailPage({ params }: { params: { id: string } }) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      product: true,
      accessInformation: { orderBy: { createdAt: "desc" } },
      paymentPlan: { include: { schedules: { orderBy: { installmentNumber: "asc" } } } },
    },
  });
  if (!purchase) notFound();

  return (
    <div>
      <div className="bo-page-header">
        <div>
          <h1>{purchase.product.title}</h1>
          <p>
            {purchase.user.firstName} {purchase.user.lastName} — <span className="mono">{purchase.user.email}</span>
          </p>
        </div>
      </div>

      {purchase.paymentPlan && purchase.paymentPlan.schedules.length > 0 && (
        <div className="bo-panel bo-panel-pad bo-payment-timeline">
          <div className="bo-section-heading">
            <div>
              <h2>Évolution des paiements</h2>
              <p>Vert = payé, pulsation = validation en cours, rouge = à payer ou en retard.</p>
            </div>
          </div>
          <div className="bo-payment-months">
            {purchase.paymentPlan.schedules.map((schedule) => {
              const state = schedule.status === "PAID" ? "paid" : schedule.status === "AWAITING_VALIDATION" ? "waiting" : schedule.status === "UPCOMING" ? "upcoming" : "late";
              const label = state === "paid" ? "Payé" : state === "waiting" ? "En validation" : state === "upcoming" ? "À venir" : "À payer";
              return (
                <div className={`bo-payment-month ${state}`} key={schedule.id}>
                  <span className="bo-payment-dot" />
                  <strong>Mois {schedule.installmentNumber}</strong>
                  <span>{Number(schedule.amount).toLocaleString("fr-FR")} FCFA</span>
                  <small>{label}</small>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AccessInfoManager
        purchaseId={purchase.id}
        items={purchase.accessInformation.map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          visibleToClient: a.visibleToClient,
          createdAt: a.createdAt.toISOString(),
          releasedAt: a.releasedAt ? a.releasedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
