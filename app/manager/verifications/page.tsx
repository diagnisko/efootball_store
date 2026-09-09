import { prisma } from "@/lib/prisma";
import { VerificationActions } from "@/components/VerificationActions";
import { IconArrowRight } from "@/components/Icons";

export const dynamic = "force-dynamic"; // toujours la dernière file d'attente, jamais de cache

export default async function ManagerVerificationsPage() {
  const requests = await prisma.verificationRequest.findMany({
    where: { status: "PENDING" },
    include: {
      user: { include: { identityDocuments: { orderBy: { uploadedAt: "desc" }, take: 3 } } },
    },
    orderBy: { submittedAt: "asc" },
  });

  return (
    <div>
      <div className="bo-page-header">
        <div>
          <h1>Vérifications d&apos;identité</h1>
          <p>{requests.length} dossier{requests.length > 1 ? "s" : ""} en attente de traitement, du plus ancien au plus récent.</p>
        </div>
      </div>

      <div className="bo-panel bo-panel-pad bo-table-wrap">
        {requests.length === 0 && <div className="bo-empty">Aucun dossier en attente.</div>}
        {requests.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Email</th>
                <th>Soumis le</th>
                <th>Documents</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.user.firstName} {r.user.lastName}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{r.user.email}</td>
                  <td className="mono">
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(r.submittedAt)}
                  </td>
                  <td>
                    {r.user.identityDocuments.length === 0 && (
                      <span style={{ fontSize: 12, color: "var(--bo-muted-2)" }}>Aucun</span>
                    )}
                    {r.user.identityDocuments.map((d) => (
                      <a
                        key={d.id}
                        href={`/api/admin/documents/${d.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="link-arrow"
                        style={{ display: "block", fontSize: 12 }}
                      >
                        {d.documentType === "FACE_PHOTO"
                          ? "Photo du visage"
                          : `${d.documentType === "NATIONAL_ID" ? "CNI" : d.documentType === "PASSPORT" ? "Passeport" : "Document"} ${d.side === "FRONT" ? "(recto)" : d.side === "BACK" ? "(verso)" : ""}`}
                        <IconArrowRight />
                      </a>
                    ))}
                  </td>
                  <td><VerificationActions requestId={r.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
