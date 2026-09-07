import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

/**
 * Point d'atterrissage commun après connexion OAuth (Google/Apple), pour appliquer la même
 * redirection par rôle que la connexion par email/mot de passe (voir app/login/page.tsx).
 * Avant ce correctif, callbackUrl pointait en dur vers /dashboard, donc un compte
 * Manager/Admin connecté via Google atterrissait sur l'espace client au lieu de sa console.
 */
export default async function PostLoginPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role === "SUPER_ADMIN") redirect("/admin/dashboard");
  if (role === "MANAGER") redirect("/manager/verifications");
  redirect("/dashboard");
}
