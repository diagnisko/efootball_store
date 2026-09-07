import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  AWAITING_DEPOSIT: { label: "Attente apport", className: "badge-muted" },
  ACTIVE: { label: "En cours", className: "badge-warn" },
  COMPLETED: { label: "Terminé", className: "badge-ok" },
  CANCELLED: { label: "Annulé", className: "badge-muted" },
};

export default async function AdminPurchasesPage() {
  const purchases = await prisma.purchase.findMany({
    where: { status: { in: ["ACTIVE", "COMPLETED"] } },
    include: {
      user: true,
      product: true,
      accessInformation: { select: { id: true, visibleToClient: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="bo-page-header">
        <div>
          <h1>Achats — informations d&apos;accès</h1>
          <p>
            Sélectionnez un achat pour transmettre au client ses identifiants ou instructions,
            de façon contrôlée et manuelle (section 18 du cahier des charges).
          </p>
        </div>
      </div>

      <div className="bo-panel bo-panel-pad bo-table-wrap">
        {purchases.length === 0 && <div className="bo-empty">Aucun achat actif pour le moment.</div>}
        {purchases.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Produit</th>
                <th>Statut</th>
                <th>Infos publiées</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => {
                const status = STATUS_LABEL[p.status] ?? STATUS_LABEL.ACTIVE;
                const published = p.accessInformation.filter((a) => a.visibleToClient).length;
                return (
                  <tr key={p.id}>
                    <td>{p.user.firstName} {p.user.lastName}</td>
                    <td>{p.product.title}</td>
                    <td><span className={`badge ${status.className}`}>{status.label}</span></td>
                    <td className="mono">{published} / {p.accessInformation.length}</td>
                    <td><Link href={`/admin/purchases/${p.id}`} className="bo-btn bo-btn-sm">Gérer</Link></td>
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
