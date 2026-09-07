import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BackofficeShell } from "@/components/BackofficeShell";
import { ADMIN_NAV_GROUPS } from "@/lib/backoffice-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  const name = session?.user?.name ?? "Administrateur";

  return (
    <BackofficeShell role="SUPER_ADMIN" userName={name} groups={ADMIN_NAV_GROUPS}>
      {children}
    </BackofficeShell>
  );
}
