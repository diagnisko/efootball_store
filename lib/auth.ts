import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();

        // Protection anti-bruteforce (section 29 du cahier des charges) : 5 échecs en 15
        // minutes suffisent à verrouiller temporairement les tentatives sur cet email. Suivi
        // par email plutôt que par IP — l'objet requête n'est pas fiable pour extraire l'IP
        // réelle dans tous les contextes de déploiement (proxy, edge...), et limiter par email
        // protège déjà l'essentiel : empêcher de tester des mots de passe en boucle sur un
        // compte donné.
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
        const recentFailures = await prisma.loginAttempt.count({
          where: { email, success: false, createdAt: { gte: fifteenMinAgo } },
        });
        if (recentFailures >= 5) {
          throw new Error("TOO_MANY_ATTEMPTS");
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { role: true },
        });

        const valid = user?.passwordHash ? await bcrypt.compare(credentials.password, user.passwordHash) : false;

        // Chaque tentative est journalisée, succès ou échec — nécessaire pour que le compteur
        // ci-dessus fonctionne, y compris pour un email qui n'existe même pas (évite qu'un
        // attaquant distingue "email inconnu" de "mauvais mot de passe" en observant le
        // comportement de verrouillage).
        await prisma.loginAttempt.create({ data: { email, success: !!valid } });

        if (!user || !valid) return null;
        if (user.accountStatus !== "ACTIVE") return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role.name,
          verificationStatus: user.verificationStatus,
        };
      },
    }),
    // Ces deux providers nécessitent les variables d'environnement
    // GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET et APPLE_ID / APPLE_SECRET.
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID ?? "",
      clientSecret: process.env.APPLE_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Création/association automatique du compte pour Google / Apple,
      // avec statut de vérification forcé à PROFILE_INCOMPLETE (règle 6.9 du cahier des charges) :
      // OAuth ne donne JAMAIS automatiquement le droit d'acheter.
      if (account?.provider === "google" || account?.provider === "apple") {
        const email = user.email?.toLowerCase().trim();
        if (!email) return false;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (!existing) {
          const clientRole = await prisma.role.findUnique({ where: { name: "CLIENT" } });
          if (!clientRole) return false;
          await prisma.user.create({
            data: {
              email,
              firstName: user.name?.split(" ")[0] ?? "Nouveau",
              lastName: user.name?.split(" ").slice(1).join(" ") || "Membre",
              roleId: clientRole.id,
              authProvider: account.provider === "google" ? "GOOGLE" : "APPLE",
              providerAccountId: account.providerAccountId,
              verificationStatus: "PROFILE_INCOMPLETE",
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.verificationStatus = (user as { verificationStatus?: string }).verificationStatus;
      }
      if (!token.role && token.email) {
        // Rafraîchit le rôle/statut à chaque token existant (ex: connexion OAuth)
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          include: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role.name;
          token.verificationStatus = dbUser.verificationStatus;
          token.sub = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { verificationStatus?: string }).verificationStatus =
          token.verificationStatus as string;
      }
      return session;
    },
  },
};
