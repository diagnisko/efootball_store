import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const HERO_IMAGE_KEY = "homepage_hero_image";

export const getHomepageHeroImageCached = unstable_cache(
  async () => {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: HERO_IMAGE_KEY },
      select: { value: true },
    });
    const value = setting?.value;
    return typeof value === "object" && value !== null && "url" in value && typeof value.url === "string"
      ? value.url
      : null;
  },
  ["homepage-hero-image"],
  { revalidate: 60, tags: ["homepage-hero-image"] }
);

export { HERO_IMAGE_KEY };
