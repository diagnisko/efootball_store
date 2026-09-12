import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BackofficeShell } from "@/components/BackofficeShell";
import { ADMIN_NAV_GROUPS } from "@/lib/backoffice-nav";
import { getManagerCapabilities } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role === "SUPER_ADMIN") {
    const name = session?.user?.name ?? "Administrateur";
    return (
      <BackofficeShell role="SUPER_ADMIN" userName={name} groups={ADMIN_NAV_GROUPS}>
        {children}
      </BackofficeShell>
    );
  }

  const userId = (session?.user as { id?: string } | undefined)?.id;
  const permissions = role === "MANAGER" && userId ? await getManagerCapabilities(userId) : null;

  if (role === "MANAGER" && permissions && Object.values(permissions).some(Boolean)) {
    const name = session?.user?.name ?? "Manager";
    const managerGroups = [
      {
        label: "Navigation",
        items: [
          ...(permissions.verify_identity ? [{ href: "/manager/verifications", label: "Vérifications" }] : []),
          ...(permissions.confirm_payment ? [{ href: "/manager/payments", label: "Paiements" }] : []),
          ...(permissions.send_access_info ? [{ href: "/manager/verification-codes", label: "Codes de vérification" }] : []),
          ...(permissions.reply_messages ? [{ href: "/manager/messages", label: "Messages" }] : []),
          ...(permissions.view_clients ? [{ href: "/admin/clients", label: "Clients" }] : []),
          ...(permissions.send_access_info ? [{ href: "/admin/purchases", label: "Infos d'accès" }] : []),
          ...(permissions.manage_offers ? [{ href: "/admin/products", label: "Offres" }] : []),
          ...(permissions.view_statistics ? [{ href: "/admin/dashboard", label: "Statistiques" }] : []),
        ],
      },
    ].filter((group) => group.items.length > 0);

    return (
      <BackofficeShell role="MANAGER" userName={name} groups={managerGroups}>
        {children}
      </BackofficeShell>
    );
  }

  redirect("/dashboard");
}
