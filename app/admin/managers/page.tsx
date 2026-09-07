import { prisma } from "@/lib/prisma";
import { ManagerPermissionsGrid } from "@/components/ManagerPermissionsGrid";

export const dynamic = "force-dynamic";

export default async function AdminManagersPage() {
  const managers = await prisma.user.findMany({
    where: { role: { name: "MANAGER" } },
    include: { managerPermissions: true },
    orderBy: { firstName: "asc" },
  });

  return (
    <div>
      <div className="bo-page-header">
        <div>
          <h1>Managers</h1>
          <p>{managers.length} manager{managers.length > 1 ? "s" : ""} avec accès à la console de supervision.</p>
        </div>
      </div>

      {managers.length === 0 && <div className="bo-panel bo-panel-pad"><div className="bo-empty">Aucun manager pour le moment.</div></div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {managers.map((m) => {
          const granted: Record<string, boolean> = {};
          m.managerPermissions.forEach((p) => { granted[p.capability] = p.granted; });
          return (
            <div key={m.id} className="bo-section">
              <div className="bo-section-head">
                <h3 style={{ textTransform: "none", fontSize: 14, color: "var(--bo-text)", fontFamily: "'Manrope'", fontWeight: 700 }}>
                  {m.firstName} {m.lastName}
                </h3>
                <span className="mono" style={{ fontSize: 12, color: "var(--bo-muted)" }}>{m.email}</span>
              </div>
              <ManagerPermissionsGrid managerId={m.id} granted={granted} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
