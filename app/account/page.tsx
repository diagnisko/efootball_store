import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountForm } from "@/components/AccountForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  return (
    <div className="dash" style={{ maxWidth: 720 }}>
      <div className="dash-head">
        <div>
          <h2>Mon profil</h2>
          <p>Gérez vos informations personnelles et votre photo de profil.</p>
        </div>
      </div>
      <AccountForm
        firstName={user.firstName}
        lastName={user.lastName}
        email={user.email}
        phone={user.phone ?? ""}
        country={user.country ?? ""}
        avatarUrl={user.avatarUrl}
        hasPassword={!!user.passwordHash}
      />
    </div>
  );
}
