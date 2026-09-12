import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BackofficeShell } from "@/components/BackofficeShell";
import { ADMIN_NAV_GROUPS } from "@/lib/backoffice-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const permissions = ((session?.user as { permissions?: Record<string, boolean> } | undefined)?.permissions ?? {}) as Record<string, boolean>;

  if (role === "SUPER_ADMIN") {
    const name = session?.user?.name ?? "Administrateur";
    return (
      <BackofficeShell role="SUPER_ADMIN" userName={name} groups={ADMIN_NAV_GROUPS}>
        {children}
      </BackofficeShell>
    );
  }

  if (role === "MANAGER" && Object.values(permissions).some(Boolean)) {
    const name = session?.user?.name ?? "Manager";
    return (
      <BackofficeShell role="MANAGER" userName={name} groups={[]}> 
        {children}
      </BackofficeShell>
    );
  }

  redirect("/dashboard");
}
