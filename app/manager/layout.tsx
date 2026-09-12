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

  const baseManagerLinks = [
    { href: "/manager/verifications", label: "Vérifications", capability: "verify_identity" },
    { href: "/manager/payments", label: "Paiements", capability: "confirm_payment" },
    { href: "/manager/verification-codes", label: "Codes de vérification", capability: "send_access_info" },
    { href: "/manager/messages", label: "Messages", capability: "reply_messages" },
  ];

  const groups = isAdmin
    ? ADMIN_NAV_GROUPS
    : [
        {
          label: "File d'attente",
          items: baseManagerLinks.filter((item) => !!managerCapabilities?.[item.capability as keyof typeof managerCapabilities]).map(({ href, label }) => ({ href, label })),
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
