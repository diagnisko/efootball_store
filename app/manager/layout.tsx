import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BackofficeShell } from "@/components/BackofficeShell";
import { ADMIN_NAV_GROUPS, MANAGER_NAV_GROUPS } from "@/lib/backoffice-nav";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || !["MANAGER", "SUPER_ADMIN"].includes(role)) redirect("/dashboard");

  const name = session?.user?.name ?? "Manager";
  const isAdmin = role === "SUPER_ADMIN";

  // Un SUPER_ADMIN qui navigue vers /manager garde son shell complet
  // (accès à toutes les sections) plutôt qu'un shell manager restreint.
  return (
    <BackofficeShell
      role={isAdmin ? "SUPER_ADMIN" : "MANAGER"}
      userName={name}
      groups={isAdmin ? ADMIN_NAV_GROUPS : MANAGER_NAV_GROUPS}
    >
      {children}
    </BackofficeShell>
  );
}
