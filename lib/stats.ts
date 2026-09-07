import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

export interface PlatformStats {
  verifiedMembersCount: number;
  onTimePaymentRate: number | null; // null si aucune donnée exploitable pour éviter d'afficher un faux chiffre
  installmentsDurationMonths: number;
}

/**
 * Calcule les statistiques affichées publiquement (hero de la landing page).
 * Ces chiffres sont TOUJOURS dérivés de la base de données au moment de la requête —
 * jamais codés en dur dans le composant. Voir app/page.tsx (revalidate) pour la fréquence
 * de recalcul en production (ISR), ce qui évite de recalculer à chaque requête tout en
 * restant "synchronisé" avec la réalité (pas de dérive comme un chiffre figé en dur).
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const [verifiedMembersCount, paidSchedules] = await Promise.all([
    prisma.user.count({
      where: { verificationStatus: "VERIFIED" },
    }),
    prisma.paymentSchedule.findMany({
      where: { status: "PAID", paidAt: { not: null } },
      select: { paidAt: true, dueDate: true },
    }),
  ]);

  let onTimePaymentRate: number | null = null;
  if (paidSchedules.length > 0) {
    const onTimeCount = paidSchedules.filter(
      (s) => s.paidAt !== null && s.paidAt <= s.dueDate
    ).length;
    onTimePaymentRate = Math.round((onTimeCount / paidSchedules.length) * 1000) / 10; // 1 décimale
  }

  return {
    verifiedMembersCount,
    onTimePaymentRate,
    installmentsDurationMonths: 8,
  };
}

/**
 * Version mise en cache de getPlatformStats(), indépendante du rendu de la page. C'est ce
 * découplage qui corrige un bug réel : mettre `export const revalidate = ...` directement sur
 * une page qui dépend aussi de la session (via le layout) fait mettre en cache la page ENTIÈRE,
 * navbar de connexion comprise — tous les visiteurs reçoivent alors la même page figée pendant
 * la durée du cache, y compris l'état "connecté/déconnecté". En cachant uniquement le calcul
 * ici, la page reste dynamique (donc fidèle à la session de chaque visiteur) sans perdre la
 * performance sur la partie coûteuse (les agrégations DB).
 */
export const getPlatformStatsCached = unstable_cache(getPlatformStats, ["platform-stats"], {
  revalidate: 300,
});

/**
 * Formatte le compteur de membres vérifiés à l'affichage (ex: "1 243" plutôt qu'un
 * chiffre rond arbitraire type "1 240+"). On n'arrondit ni n'exagère : on montre le vrai
 * nombre, avec un séparateur de milliers.
 */
export function formatMemberCount(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}
