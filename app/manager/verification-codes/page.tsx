import { prisma } from "@/lib/prisma";
import { VerificationCodeActions } from "@/components/VerificationCodeActions";

export const dynamic = "force-dynamic"; // file d'attente en direct, comme paiements/vérifications

export default async function VerificationCodesPage() {
  const requests = await prisma.verificationCodeRequest.findMany({
    where: { status: "PENDING" },
    include: { purchase: { include: { user: true, product: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="bo-page-header">
        <div>
          <h1>Codes de vérification</h1>
          <p>
            Le client a reçu une demande de code (2FA) de Konami au premier login sur son
            nouveau compte. {requests.length} demande{requests.length > 1 ? "s" : ""} en attente
            — consultez la boîte mail/téléphone associée au compte, puis transmettez le code ici.
          </p>
        </div>
      </div>

      <div className="bo-panel bo-panel-pad bo-table-wrap">
        {requests.length === 0 && <div className="bo-empty">Aucune demande en attente.</div>}
        {requests.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Produit</th>
                <th>Demandé le</th>
                <th>Note du client</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.purchase.user.firstName} {r.purchase.user.lastName}</td>
                  <td>{r.purchase.product.title}</td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(r.createdAt)}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--bo-muted)" }}>{r.note || "—"}</td>
                  <td><VerificationCodeActions requestId={r.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
