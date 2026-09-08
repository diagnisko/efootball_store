import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HERO_IMAGE_KEY } from "@/lib/site-settings";
import { requireCapability } from "@/lib/permissions";
import { logAdminAction } from "@/lib/admin-log";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const actorId = (session?.user as { id?: string } | undefined)?.id;
  const actorRole = (session?.user as { role?: string } | undefined)?.role;
  if (!actorId || !actorRole) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  try {
    await requireCapability(actorId, "manage_offers");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { url?: string };
  const url = body.url?.trim() ?? "";
  if (url && !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "L'image doit utiliser une URL http(s)." }, { status: 400 });
  }

  const previous = await prisma.platformSetting.findUnique({ where: { key: HERO_IMAGE_KEY } });
  const setting = await prisma.platformSetting.upsert({
    where: { key: HERO_IMAGE_KEY },
    update: { value: { url } },
    create: { key: HERO_IMAGE_KEY, value: { url }, updatedBy: actorId },
  });

  await logAdminAction({
    actorId,
    actorRole,
    action: "homepage_hero_image.update",
    targetType: "platform_setting",
    targetId: setting.id,
    oldValue: previous?.value ?? undefined,
    newValue: { url },
  });
  revalidateTag("homepage-hero-image");
  return NextResponse.json({ ok: true, url });
}
