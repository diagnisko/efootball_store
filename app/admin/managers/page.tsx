import { prisma } from "@/lib/prisma";
import { AdminManagersPanel } from "@/components/AdminManagersPanel";

export const dynamic = "force-dynamic";

export default async function AdminManagersPage() {
  const managers = await prisma.user.findMany({
    where: { role: { name: "MANAGER" }, accountStatus: { not: "CANCELLED" } },
    include: { managerPermissions: true },
    orderBy: { firstName: "asc" },
  });

  const initialManagers = managers.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    createdAt: m.createdAt.toISOString(),
    granted: Object.fromEntries(m.managerPermissions.map((permission) => [permission.capability, permission.granted])),
  }));

  return (
    <div>
      <div className="bo-page-header">
        <div>
          <h1>Managers</h1>
          <p>{managers.length} manager{managers.length > 1 ? "s" : ""} avec accès à la console de supervision.</p>
        </div>
      </div>

      <AdminManagersPanel initialManagers={initialManagers} />
    </div>
  );
}
