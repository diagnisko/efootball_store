import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

/**
 * Le catalogue public est mis en cache indépendamment du rendu de la page (voir lib/stats.ts
 * pour le même principe appliqué aux statistiques). Ça permet à la page d'accueil de rester
 * dynamique (donc de refléter correctement la session de chaque visiteur) sans repayer le
 * coût d'une requête DB à chaque chargement — les deux préoccupations sont découplées.
 */
export const getPublicCatalogCached = unstable_cache(
  async () => {
    return prisma.product.findMany({
      where: { status: { in: ["AVAILABLE", "IN_PROGRESS", "SOLD"] } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: {
        media: {
          orderBy: [{ isMain: "desc" }, { position: "asc" }],
          take: 1,
        },
      },
    });
  },
  ["public-catalog"],
  { revalidate: 30 }
);
