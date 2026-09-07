import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { RevenueChart } from "@/components/RevenueChart";
import { PaymentStatusChart } from "@/components/PaymentStatusChart";

export const dynamic = "force-dynamic";

const MONTH_LABELS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export default async function AdminDashboardPage() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    paidSchedulesAgg,
    paidDeposits,
    activePlans,
    totalClients,
    verifiedClients,
    pendingClients,
    pendingPayments,
    lateSchedules,
    paidSchedulesCount,
    offersByStatus,
    paidSchedulesForChart,
    paidDepositsForChart,
  ] = await Promise.all([
    prisma.paymentSchedule.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.paymentPlan.findMany({
      where: { initialDepositStatus: "PAID" },
      select: { initialDepositAmount: true },
    }),
    prisma.paymentPlan.findMany({ where: { status: "ACTIVE" }, select: { remainingAmount: true } }),
    prisma.user.count({ where: { role: { name: "CLIENT" } } }),
    prisma.user.count({ where: { verificationStatus: "VERIFIED" } }),
    prisma.user.count({ where: { verificationStatus: "PENDING" } }),
    prisma.paymentSubmission.count({ where: { status: "PENDING" } }),
    prisma.paymentSchedule.count({ where: { status: { in: ["LATE", "PENALIZED"] } } }),
    prisma.paymentSchedule.count({ where: { status: "PAID" } }),
    prisma.product.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.paymentSchedule.findMany({
      where: { status: "PAID", paidAt: { gte: sixMonthsAgo } },
      select: { amount: true, paidAt: true },
    }),
    prisma.paymentPlan.findMany({
      where: { initialDepositStatus: "PAID", startDate: { gte: sixMonthsAgo } },
      select: { initialDepositAmount: true, startDate: true },
    }),
  ]);

  const revenueCollected =
    Number(paidSchedulesAgg._sum.amount ?? 0) +
    paidDeposits.reduce((sum, p) => sum + Number(p.initialDepositAmount), 0);
  const remainingToCollect = activePlans.reduce((sum, p) => sum + Number(p.remainingAmount), 0);

  const offerCounts: Record<string, number> = { AVAILABLE: 0, IN_PROGRESS: 0, SOLD: 0, HIDDEN: 0 };
  offersByStatus.forEach((o) => { offerCounts[o.status] = o._count._all; });

  // ----- Données du graphique de revenu mensuel (6 derniers mois, calcul réel, pas simulé) -----
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()] });
  }
  const revenueMap = new Map(months.map((m) => [m.key, 0]));
  paidSchedulesForChart.forEach((s) => {
    if (!s.paidAt) return;
    const key = `${s.paidAt.getFullYear()}-${s.paidAt.getMonth()}`;
    if (revenueMap.has(key)) revenueMap.set(key, revenueMap.get(key)! + Number(s.amount));
  });
  paidDepositsForChart.forEach((p) => {
    if (!p.startDate) return;
    const key = `${p.startDate.getFullYear()}-${p.startDate.getMonth()}`;
    if (revenueMap.has(key)) revenueMap.set(key, revenueMap.get(key)! + Number(p.initialDepositAmount));
  });
  const revenueData = months.map((m) => ({ month: m.label, revenue: revenueMap.get(m.key)! }));

  const paymentStatusData = [
    { name: "Payées", value: paidSchedulesCount },
    { name: "En attente", value: pendingPayments },
    { name: "En retard", value: lateSchedules },
  ];

  const stat = (label: string, value: string, href?: string, alert?: boolean) => {
    const content = (
      <div className={`bo-stat${alert ? " is-alert" : ""}`}>
        <div className="bo-stat-label">{label}</div>
        <div className="bo-stat-value">{value}</div>
      </div>
    );
    return href ? <Link key={label} href={href} style={{ textDecoration: "none" }}>{content}</Link> : <div key={label}>{content}</div>;
  };

  return (
    <div>
      <div className="bo-page-header">
        <div>
          <h1>Statistiques de la plateforme</h1>
          <p>Vue d&apos;ensemble de l&apos;activité commerciale et des files de traitement en cours.</p>
        </div>
      </div>

      <div className="bo-stat-grid">
        {stat("Montant encaissé", `${revenueCollected.toLocaleString("fr-FR")} FCFA`)}
        {stat("Reste à recevoir", `${remainingToCollect.toLocaleString("fr-FR")} FCFA`)}
        {stat("Clients", `${totalClients}`, "/admin/clients")}
        {stat("Clients vérifiés", `${verifiedClients}`, "/admin/clients?status=VERIFIED")}
        {stat("Clients en attente", `${pendingClients}`, "/admin/clients?status=PENDING")}
        {stat("Paiements en attente", `${pendingPayments}`, "/manager/payments")}
        {stat("Paiements en retard", `${lateSchedules}`, undefined, lateSchedules > 0)}
      </div>

      <div className="bo-grid-2" style={{ marginBottom: 20 }}>
        <div className="bo-section">
          <div className="bo-section-head"><h3>Revenu mensuel (6 derniers mois)</h3></div>
          <RevenueChart data={revenueData} />
        </div>
        <div className="bo-section">
          <div className="bo-section-head"><h3>Répartition des paiements</h3></div>
          <PaymentStatusChart data={paymentStatusData} />
        </div>
      </div>

      <div className="bo-section">
        <div className="bo-section-head"><h3>Offres par statut</h3></div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div><span className="badge badge-ok">Disponible</span> — {offerCounts.AVAILABLE}</div>
          <div><span className="badge badge-warn">En cours</span> — {offerCounts.IN_PROGRESS}</div>
          <div><span className="badge badge-muted">Vendues</span> — {offerCounts.SOLD}</div>
          <div><span className="badge badge-muted">Masquées</span> — {offerCounts.HIDDEN}</div>
        </div>
      </div>

      {lateSchedules > 0 && (
        <div className="bo-section" style={{ borderColor: "rgba(240,53,154,.35)" }}>
          <div className="bo-section-head">
            <h3 style={{ color: "var(--neon)" }}>{lateSchedules} paiement{lateSchedules > 1 ? "s" : ""} en retard</h3>
          </div>
          <p style={{ fontSize: 13, color: "var(--bo-muted)", marginBottom: 14 }}>
            Configurez les règles ou déclenchez le job de traitement des retards.
          </p>
          <Link href="/admin/settings" className="bo-btn bo-btn-primary bo-btn-sm">Gérer les retards</Link>
        </div>
      )}
    </div>
  );
}
