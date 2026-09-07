import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeleteProductButton } from "@/components/DeleteProductButton";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  AVAILABLE: { label: "Disponible", className: "badge-ok" },
  IN_PROGRESS: { label: "En cours de paiement", className: "badge-warn" },
  SOLD: { label: "Vendu", className: "badge-muted" },
  HIDDEN: { label: "Masqué", className: "badge-muted" },
};

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { purchases: true } } },
  });

  return (
    <div>
      <div className="bo-page-header">
        <div>
          <h1>Offres</h1>
          <p>{products.length} offre{products.length > 1 ? "s" : ""} publiée{products.length > 1 ? "s" : ""}.</p>
        </div>
        <div className="bo-page-actions">
          <Link href="/admin/products/new" className="bo-btn bo-btn-primary">+ Nouvelle offre</Link>
        </div>
      </div>

      <div className="bo-panel bo-panel-pad bo-table-wrap">
        {products.length === 0 && <div className="bo-empty">Aucune offre publiée pour le moment.</div>}
        {products.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Titre</th>
                <th>Prix</th>
                <th>Statut</th>
                <th>Achats</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const status = STATUS_LABEL[p.status] ?? STATUS_LABEL.AVAILABLE;
                return (
                  <tr key={p.id}>
                    <td>{p.title}{p.featured && <span className="badge badge-ok" style={{ marginLeft: 8 }}>Mise en avant</span>}</td>
                    <td className="mono">{Number(p.priceTotal).toLocaleString("fr-FR")} FCFA</td>
                    <td><span className={`badge ${status.className}`}>{status.label}</span></td>
                    <td className="mono">{p._count.purchases}</td>
                    <td>
                      <div className="bo-row-actions">
                        <Link href={`/admin/products/${p.id}/edit`} className="bo-btn bo-btn-sm">Modifier</Link>
                        <DeleteProductButton productId={p.id} title={p.title} />
                      </div>
                    </td>
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
