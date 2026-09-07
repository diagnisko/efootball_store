import { prisma } from "@/lib/prisma";
import { IconArrowRight } from "@/components/Icons";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const ACTION_LABEL: Record<string, string> = {
  "verification.approve": "Vérification approuvée",
  "verification.reject": "Vérification refusée",
  "verification_code.provide": "Code de vérification fourni",
  "verification_code.cancel": "Demande de code annulée",
  "payment.confirm": "Paiement confirmé",
  "payment.reject": "Paiement refusé",
  "payment.info_requested": "Infos demandées (paiement)",
  "offer.create": "Offre créée",
  "offer.update": "Offre modifiée",
  "offer.delete": "Offre supprimée",
  "manager.permission.update": "Permission Manager modifiée",
  "access_info.create": "Info d'accès créée",
  "access_info.release": "Info d'accès publiée",
  "access_info.update": "Info d'accès modifiée",
  "access_info.delete": "Info d'accès supprimée",
  "client.suspend": "Client suspendu",
  "client.reactivate": "Client réactivé",
  "client.delete": "Client supprimé",
  "conversation.status_update": "Statut conversation modifié",
  "late_rules.update": "Règles de retard modifiées",
  "contract.auto_cancel": "Contrat annulé (auto)",
  "user.auto_suspend": "Compte suspendu (auto)",
  "identity_document.view": "Document d'identité consulté",
  "payment_proof.view": "Preuve de paiement consultée",
};

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);

  const where = q
    ? {
        OR: [
          { action: { contains: q, mode: "insensitive" as const } },
          { targetType: { contains: q, mode: "insensitive" as const } },
          { actor: { email: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.adminLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `/admin/logs?${params.toString()}`;
  };

  return (
    <div>
      <div className="bo-page-header">
        <div>
          <h1>Journal d&apos;audit</h1>
          <p>
            Chaque action sensible (validation, paiement, suppression, consultation de document...)
            est journalisée ici — section 28 du cahier des charges. {total} entrée{total > 1 ? "s" : ""} au total.
          </p>
        </div>
      </div>

      <form className="bo-toolbar">
        <input
          className="bo-input"
          type="text"
          name="q"
          placeholder="Rechercher par action, type de cible, ou email de l'acteur..."
          defaultValue={q}
        />
        <button type="submit" className="bo-btn bo-btn-primary">Filtrer</button>
        {q && <Link href="/admin/logs" className="bo-btn">Réinitialiser</Link>}
      </form>

      <div className="bo-panel bo-panel-pad bo-table-wrap">
        {logs.length === 0 && <div className="bo-empty">Aucune entrée ne correspond à ces critères.</div>}
        {logs.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Acteur</th>
                <th>Action</th>
                <th>Cible</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="mono" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(log.createdAt)}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {log.actor.firstName} {log.actor.lastName}
                    <br />
                    <span style={{ color: "var(--bo-muted-2)", fontSize: 10 }}>
                      {log.actorRole === "SYSTEM" ? "SYSTÈME (job auto)" : log.actorRole}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <span className="badge badge-muted" style={{ fontSize: 10 }}>
                      {ACTION_LABEL[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: "var(--bo-muted)" }}>
                    {log.targetType}
                    <br />
                    <span style={{ fontSize: 10 }}>{log.targetId.slice(0, 8)}...</span>
                  </td>
                  <td style={{ fontSize: 10, color: "var(--bo-muted-2)", maxWidth: 240 }}>
                    {log.oldValue ? <div>avant: {JSON.stringify(log.oldValue).slice(0, 80)}</div> : null}
                    {log.newValue ? <div>après: {JSON.stringify(log.newValue).slice(0, 80)}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="bo-pagination">
          <span>Page {page} sur {totalPages}</span>
          <div className="bo-page-links">
            {page > 1 && <Link href={qs(page - 1)} className="bo-btn bo-btn-sm">← Précédent</Link>}
            {page < totalPages && <Link href={qs(page + 1)} className="bo-btn bo-btn-sm">Suivant <IconArrowRight /></Link>}
          </div>
        </div>
      )}
    </div>
  );
}
