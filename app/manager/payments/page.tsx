import { prisma } from "@/lib/prisma";
import { PaymentActions } from "@/components/PaymentActions";
import { IconArrowRight } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function ManagerPaymentsPage() {
  const submissions = await prisma.paymentSubmission.findMany({
    where: { status: "PENDING" },
    include: {
      user: true,
      paymentSchedule: true,
      paymentPlan: { include: { purchase: { include: { product: true } } } },
    },
    orderBy: { submittedAt: "asc" },
  });

  return (
    <div>
      <div className="bo-page-header">
        <div>
          <h1>Paiements à valider</h1>
          <p>{submissions.length} soumission{submissions.length > 1 ? "s" : ""} en attente de confirmation.</p>
        </div>
      </div>

      <div className="bo-panel bo-panel-pad bo-table-wrap">
        {submissions.length === 0 && <div className="bo-empty">Aucun paiement en attente.</div>}
        {submissions.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Produit</th>
                <th>Type</th>
                <th>Montant</th>
                <th>Référence</th>
                <th>Preuve</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => {
                const isDeposit = !s.paymentScheduleId;
                const product = s.paymentPlan?.purchase.product;
                const amount = isDeposit ? s.paymentPlan?.initialDepositAmount : s.paymentSchedule?.amount;
                return (
                  <tr key={s.id}>
                    <td>{s.user.firstName} {s.user.lastName}</td>
                    <td>{product?.title ?? "—"}</td>
                    <td>
                      <span className="badge badge-warn">
                        {isDeposit ? "Apport initial" : `Échéance n°${s.paymentSchedule?.installmentNumber}`}
                      </span>
                    </td>
                    <td className="mono">{amount ? Number(amount).toLocaleString("fr-FR") + " FCFA" : "—"}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{s.reference || "—"}</td>
                    <td>
                      {s.proofUrl ? (
                        <a href={`/api/admin/payment-proofs/${s.id}`} target="_blank" rel="noreferrer" className="link-arrow" style={{ fontSize: 12 }}>
                          Voir <IconArrowRight />
                        </a>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--bo-muted-2)" }}>—</span>
                      )}
                    </td>
                    <td><PaymentActions submissionId={s.id} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
