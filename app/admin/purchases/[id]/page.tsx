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
  const schedules = purchase.paymentPlan?.schedules ?? [];
  const paidCount = schedules.filter((schedule) => schedule.status === "PAID").length;
  const waitingCount = schedules.filter((schedule) => schedule.status === "AWAITING_VALIDATION").length;
  const paidAmount = schedules
    .filter((schedule) => schedule.status === "PAID")
    .reduce((total, schedule) => total + Number(schedule.amount), 0);
  const progress = schedules.length ? Math.round((paidCount / schedules.length) * 100) : 0;

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

      {purchase.paymentPlan && schedules.length > 0 && (
        <section className="bo-panel bo-panel-pad bo-payment-timeline">
          <div className="bo-section-heading">
            <div>
              <h2>Évolution des paiements</h2>
              <p>Suivi détaillé du plan de paiement de ce compte.</p>
            </div>
            <span className="bo-payment-plan-label">{purchase.paymentPlan.installmentsCount} mois</span>
          </div>
          <div className="bo-payment-overview">
            <div className="bo-payment-progress-block">
              <div className="bo-payment-progress-top">
                <span>Progression du plan</span>
                <strong>{progress}%</strong>
              </div>
              <div className="bo-payment-progress-track"><span style={{ width: `${progress}%` }} /></div>
              <div className="bo-payment-progress-meta">
                <span>{paidCount} sur {schedules.length} échéances validées</span>
                <strong>{paidAmount.toLocaleString("fr-FR")} FCFA versés</strong>
              </div>
            </div>
            <div className="bo-payment-stat is-paid"><strong>{paidCount}</strong><span>Payés</span></div>
            <div className="bo-payment-stat is-waiting"><strong>{waitingCount}</strong><span>En validation</span></div>
            <div className="bo-payment-stat is-late"><strong>{schedules.length - paidCount - waitingCount}</strong><span>À traiter</span></div>
          </div>
          <div className="bo-payment-legend">
            <span><i className="paid" /> Payé</span>
            <span><i className="waiting" /> Validation en cours</span>
            <span><i className="late" /> À payer / en retard</span>
          </div>
          <div className="bo-payment-months">
            {schedules.map((schedule) => {
              const state = schedule.status === "PAID" ? "paid" : schedule.status === "AWAITING_VALIDATION" ? "waiting" : schedule.status === "UPCOMING" ? "upcoming" : "late";
              const label = state === "paid" ? "Payé" : state === "waiting" ? "En validation" : state === "upcoming" ? "À venir" : "À payer";
              return (
                <div className={`bo-payment-month ${state}`} key={schedule.id}>
                  <div className="bo-payment-month-head"><span>Mois {String(schedule.installmentNumber).padStart(2, "0")}</span><b>{label}</b></div>
                  <strong>{Number(schedule.amount).toLocaleString("fr-FR")} <small>FCFA</small></strong>
                  <span className="bo-payment-date">Échéance {new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(schedule.dueDate)}</span>
                  <div className="bo-payment-state"><i className="bo-payment-dot" />{label}</div>
                </div>
              );
            })}
          </div>
        </section>
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
