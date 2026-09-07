import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ClientStatusActions } from "@/components/ClientStatusActions";
import { IconArrowRight } from "@/components/Icons";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const VERIF_LABEL: Record<string, { label: string; className: string }> = {
  NOT_SUBMITTED: { label: "Non soumis", className: "badge-muted" },
  PROFILE_INCOMPLETE: { label: "Profil à compléter", className: "badge-muted" },
  PENDING: { label: "En attente", className: "badge-warn" },
  VERIFIED: { label: "Vérifié", className: "badge-ok" },
  REJECTED: { label: "Refusé", className: "badge-danger" },
};

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const statusFilter = searchParams.status ?? "";
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);

  const where: Prisma.UserWhereInput = {
    role: { name: "CLIENT" },
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(statusFilter ? { verificationStatus: statusFilter as Prisma.UserWhereInput["verificationStatus"] } : {}),
  };

  const [clients, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { _count: { select: { purchases: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(p));
    return `/admin/clients?${params.toString()}`;
  };

  return (
    <div>
      <div className="bo-page-header">
        <div>
          <h1>Clients</h1>
          <p>{total} client{total > 1 ? "s" : ""} au total.</p>
        </div>
      </div>

      <form className="bo-toolbar">
        <input className="bo-input" type="text" name="q" placeholder="Rechercher par nom ou email..." defaultValue={q} />
        <select className="bo-select" name="status" defaultValue={statusFilter}>
          <option value="">Tous les statuts</option>
          <option value="VERIFIED">Vérifié</option>
          <option value="PENDING">En attente</option>
          <option value="REJECTED">Refusé</option>
          <option value="NOT_SUBMITTED">Non soumis</option>
          <option value="PROFILE_INCOMPLETE">Profil à compléter</option>
        </select>
        <button type="submit" className="bo-btn bo-btn-primary">Filtrer</button>
        {(q || statusFilter) && <Link href="/admin/clients" className="bo-btn">Réinitialiser</Link>}
      </form>

      <div className="bo-panel bo-panel-pad bo-table-wrap">
        {clients.length === 0 && <div className="bo-empty">Aucun client ne correspond à ces critères.</div>}
        {clients.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Email</th>
                <th>Vérification</th>
                <th>Compte</th>
                <th>Achats</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const verif = VERIF_LABEL[c.verificationStatus] ?? VERIF_LABEL.NOT_SUBMITTED;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/clients/${c.id}`} style={{ color: "var(--bo-text)", textDecoration: "none", fontWeight: 600 }}>
                        {c.firstName} {c.lastName}
                      </Link>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{c.email}</td>
                    <td><span className={`badge ${verif.className}`}>{verif.label}</span></td>
                    <td>
                      {c.accountStatus === "SUSPENDED" ? (
                        <span className="badge badge-danger">Suspendu</span>
                      ) : c.accountStatus === "CANCELLED" ? (
                        <span className="badge badge-muted">Annulé</span>
                      ) : (
                        <span className="badge badge-ok">Actif</span>
                      )}
                    </td>
                    <td className="mono">{c._count.purchases}</td>
                    <td>
                      <div className="bo-row-actions">
                        <Link href={`/admin/clients/${c.id}`} className="bo-btn bo-btn-sm">Voir</Link>
                        <ClientStatusActions clientId={c.id} accountStatus={c.accountStatus} />
                      </div>
                    </td>
                  </tr>
                );
              })}
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
