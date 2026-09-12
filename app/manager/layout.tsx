import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BackofficeShell } from "@/components/BackofficeShell";
import { ADMIN_NAV_GROUPS } from "@/lib/backoffice-nav";
import { getManagerCapabilities } from "@/lib/permissions";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || !["MANAGER", "SUPER_ADMIN"].includes(role)) redirect("/dashboard");

  const userId = (session?.user as { id?: string } | undefined)?.id;
  const name = session?.user?.name ?? "Manager";
  const isAdmin = role === "SUPER_ADMIN";

  const managerCapabilities = userId && !isAdmin ? await getManagerCapabilities(userId) : null;

  const groups = isAdmin
    ? ADMIN_NAV_GROUPS
    : [
        {
          label: "File d'attente",
          items: [
            { href: "/manager/verifications", label: "Vérifications" },
            { href: "/manager/payments", label: "Paiements" },
            { href: "/manager/verification-codes", label: "Codes de vérification" },
            { href: "/manager/messages", label: "Messages" },
          ].filter((item) => {
            if (item.href === "/manager/messages") return true;
            if (item.href === "/manager/verifications") return true;
            if (item.href === "/manager/payments") return true;
            if (item.href === "/manager/verification-codes") return true;
            return false;
          }),
        },
        ...(managerCapabilities?.view_clients
          ? [{ label: "Clients", items: [{ href: "/admin/clients", label: "Clients" }] }]
          : []),
        ...(managerCapabilities?.manage_offers
          ? [{ label: "Commerce", items: [{ href: "/admin/products", label: "Offres" }] }]
          : []),
        ...(managerCapabilities?.view_statistics
          ? [{ label: "Pilotage", items: [{ href: "/admin/dashboard", label: "Statistiques" }] }]
          : []),
      ];

  return (
    <BackofficeShell
      role={isAdmin ? "SUPER_ADMIN" : "MANAGER"}
      userName={name}
      groups={groups}
    >
      {children}
    </BackofficeShell>
  );
}
