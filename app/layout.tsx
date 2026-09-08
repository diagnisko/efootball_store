import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountMenu } from "@/components/AccountMenu";
import { MobileNavToggle } from "@/components/MobileNavToggle";
import { unstable_cache } from "next/cache";

export const metadata: Metadata = {
  title: "VANTA — Comptes eFootball vérifiés",
  description: "Plateforme premium de vente de comptes eFootball Mobile avec paiement échelonné.",
};

// Cette requête s'exécute au chargement de CHAQUE page (elle vit dans le layout racine).
// La mettre en cache 60s coupe un aller-retour DB à chaque navigation — c'était la requête
// la plus répétée de toute l'application. L'avatar/nom n'ont pas besoin d'être plus frais
// que ça pour la barre de nav ; router.refresh() (utilisé après les actions du compte)
// revalide immédiatement de toute façon.
const getNavUser = unstable_cache(
  async (userId: string) =>
    prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true, avatarUrl: true },
    }),
  ["nav-user"],
  { revalidate: 60, tags: ["nav-user"] }
);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;

  const currentUser = userId ? await getNavUser(userId) : null;

  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <div className="grid-overlay" />
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <nav>
            <Link href="/" className="logo">
              <div className="logo-mark" />
              <div className="logo-text">VANTA</div>
            </Link>
            <div className="nav-links">
              <Link href="/">Accueil</Link>
              <Link href="/#catalogue">Offres</Link>
              {role === "MANAGER" && <Link href="/manager/verifications">Manager</Link>}
              {role === "SUPER_ADMIN" && <Link href="/admin/dashboard">Admin</Link>}
            </div>
            <div className="nav-cta">
              {currentUser ? (
                <>
                  <Link href="/messages" className="btn btn-ghost">Messages</Link>
                  <AccountMenu
                    name={`${currentUser.firstName} ${currentUser.lastName}`}
                    email={currentUser.email}
                    avatarUrl={currentUser.avatarUrl}
                  />
                </>
              ) : (
                <>
                  <Link href="/login" className="btn btn-ghost">Connexion</Link>
                  <Link href="/register" className="btn btn-primary">Créer un compte</Link>
                </>
              )}
              <MobileNavToggle
                links={[
                  { href: "/", label: "Accueil" },
                  { href: "/#catalogue", label: "Offres" },
                  ...(role === "MANAGER"
                    ? [{ href: "/manager/verifications", label: "Manager" }]
                    : []),
                  ...(role === "SUPER_ADMIN" ? [{ href: "/admin/dashboard", label: "Admin" }] : []),
                ]}
              />
            </div>
          </nav>
          {children}
        </Providers>
      </body>
    </html>
  );
}
