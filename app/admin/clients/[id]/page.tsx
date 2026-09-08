import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ClientStatusActions } from "@/components/ClientStatusActions";
import { ClientNotesPanel } from "@/components/ClientNotesPanel";
import { ClientPaymentExport } from "@/components/ClientPaymentExport";

export const dynamic = "force-dynamic";

const PURCHASE_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  AWAITING_DEPOSIT: { label: "Attente apport", className: "badge-muted" },
  ACTIVE: { label: "En cours", className: "badge-warn" },
  COMPLETED: { label: "Terminé", className: "badge-ok" },
  CANCELLED: { label: "Annulé", className: "badge-danger" },
};

export default async function AdminClientDetailPage({ params }: { params: { id: string } }) {
  const client = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      role: true,
      identityDocuments: { orderBy: { uploadedAt: "desc" } },
      verificationRequests: { orderBy: { submittedAt: "desc" }, take: 5 },
      purchases: { include: { product: true }, orderBy: { createdAt: "desc" } },
      clientNotesReceived: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!client || client.role.name !== "CLIENT") notFound();

  const totalPaid = client.purchases.reduce((sum, p) => {
    // Approximation simple : on ne recalcule pas ici le détail échéance par échéance,
    // juste un ordre de grandeur utile pour la vue d'ensemble admin.
    return sum + (p.status === "COMPLETED" ? Number(p.totalPrice) : 0);
  }, 0);

  return (
    <div>
      <Link href="/admin/clients" className="link-arrow" style={{ display: "inline-block", marginBottom: 16 }}>
        ← Retour aux clients
      </Link>

      <div className="bo-page-header">
        <div>
          <h1>{client.firstName} {client.lastName}</h1>
          <p className="mono">{client.email}</p>
        </div>
        <div className="bo-page-actions">
          <ClientStatusActions clientId={client.id} accountStatus={client.accountStatus} />
        </div>
      </div>

      <div className="bo-grid-2" style={{ marginBottom: 20 }}>
        <div className="bo-section">
          <div className="bo-section-head"><h3>Informations</h3></div>
          <div className="bo-kv">
            <div className="bo-kv-row"><span className="k">Téléphone</span><span className="v">{client.phone || "—"}</span></div>
            <div className="bo-kv-row"><span className="k">Pays</span><span className="v">{client.country || "—"}</span></div>
            <div className="bo-kv-row"><span className="k">Inscrit le</span><span className="v">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(client.createdAt)}</span></div>
            <div className="bo-kv-row"><span className="k">Méthode de connexion</span><span className="v">{client.authProvider}</span></div>
          </div>
        </div>
        <div className="bo-section">
          <div className="bo-section-head"><h3>Résumé</h3></div>
          <div className="bo-kv">
            <div className="bo-kv-row"><span className="k">Statut de vérification</span><span className="v">{client.verificationStatus}</span></div>
            <div className="bo-kv-row"><span className="k">Nombre d&apos;achats</span><span className="v">{client.purchases.length}</span></div>
            <div className="bo-kv-row"><span className="k">Montant réglé (achats terminés)</span><span className="v">{totalPaid.toLocaleString("fr-FR")} FCFA</span></div>
          </div>
        </div>
      </div>

      <div className="bo-panel bo-panel-pad bo-table-wrap" style={{ marginBottom: 20 }}>
        <h3>Pièces d&apos;identité</h3>
        {client.identityDocuments.length === 0 && <div className="bo-empty">Aucune pièce téléversée.</div>}
        {client.identityDocuments.length > 0 && (
          <table>
            <thead><tr><th>Type</th><th>Face</th><th>Téléversé le</th><th>Statut</th><th>Document</th></tr></thead>
            <tbody>
              {client.identityDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.documentType === "NATIONAL_ID" ? "Carte d&apos;identité" : doc.documentType === "PASSPORT" ? "Passeport" : "Autre document"}</td>
                  <td>{doc.side === "FRONT" ? "Recto" : doc.side === "BACK" ? "Verso" : "—"}</td>
                  <td className="mono">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(doc.uploadedAt)}</td>
                  <td>{doc.status}</td>
                  <td>
                    <a href={`/api/admin/documents/${doc.id}`} target="_blank" rel="noreferrer" className="link-arrow">Ouvrir</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bo-panel bo-panel-pad bo-table-wrap" style={{ marginBottom: 20 }}>
        <h3>Historique de vérification</h3>
        {client.verificationRequests.length === 0 && <div className="bo-empty">Aucune demande soumise.</div>}
        {client.verificationRequests.length > 0 && (
          <table>
            <thead><tr><th>Soumis le</th><th>Statut</th><th>Motif de refus</th></tr></thead>
            <tbody>
              {client.verificationRequests.map((v) => (
                <tr key={v.id}>
                  <td className="mono">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(v.submittedAt)}</td>
                  <td>{v.status}</td>
                  <td style={{ fontSize: 12, color: "var(--bo-muted)" }}>{v.rejectionReason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bo-panel bo-panel-pad bo-table-wrap" style={{ marginBottom: 20 }}>
        <h3>Achats</h3>
        <ClientPaymentExport clientId={client.id} />
        {client.purchases.length === 0 && <div className="bo-empty">Aucun achat.</div>}
        {client.purchases.length > 0 && (
          <table>
            <thead><tr><th>Produit</th><th>Prix</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              {client.purchases.map((p) => {
                const status = PURCHASE_STATUS_LABEL[p.status] ?? PURCHASE_STATUS_LABEL.ACTIVE;
                return (
                  <tr key={p.id}>
                    <td>{p.product.title}</td>
                    <td className="mono">{Number(p.totalPrice).toLocaleString("fr-FR")} FCFA</td>
                    <td><span className={`badge ${status.className}`}>{status.label}</span></td>
                    <td>
                      {(p.status === "ACTIVE" || p.status === "COMPLETED") && (
                        <Link href={`/admin/purchases/${p.id}`} className="bo-btn bo-btn-sm">Infos d&apos;accès</Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ClientNotesPanel
        clientId={client.id}
        notes={client.clientNotesReceived.map((n) => ({
          id: n.id,
          content: n.content,
          createdAt: n.createdAt.toISOString(),
          authorName: `${n.author.firstName} ${n.author.lastName}`,
        }))}
      />
    </div>
  );
}
