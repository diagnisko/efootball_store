import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { logAdminAction } from "@/lib/admin-log";
import { sendEmail } from "@/lib/email";
import { accessInfoReleasedEmail } from "@/lib/email-templates";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const actorId = (session.user as { id: string }).id;
  const actorRole = (session.user as { role: string }).role;

  try {
    await requireCapability(actorId, "send_access_info");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const existing = await prisma.accessInformation.findUnique({
    where: { id: params.id },
    include: { purchase: { include: { product: true, user: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const { title, content, visibleToClient } = (await req.json().catch(() => ({}))) as {
    title?: string;
    content?: string;
    visibleToClient?: boolean;
  };

  const isNowReleased = visibleToClient === true && !existing.visibleToClient;

  const updated = await prisma.accessInformation.update({
    where: { id: existing.id },
    data: {
      title: title ?? undefined,
      content: content ?? undefined,
      visibleToClient: visibleToClient ?? undefined,
      releasedAt: isNowReleased ? new Date() : undefined,
    },
  });

  if (isNowReleased) {
    // Notification volontairement générique : elle ne contient jamais le contenu sensible
    // lui-même, seulement une invitation à se connecter pour le consulter (section 17).
    await prisma.notification.create({
      data: {
        userId: existing.purchase.userId,
        type: "access_info_released",
        title: "Nouvelle information disponible",
        body: `Une information d'accès concernant "${existing.purchase.product.title}" est maintenant disponible dans votre dashboard.`,
        link: "/dashboard",
      },
    });
    // Même règle pour l'email : générique, jamais le contenu.
    await sendEmail({
      to: existing.purchase.user.email,
      ...accessInfoReleasedEmail(existing.purchase.user.firstName, existing.purchase.product.title),
    });
  }

  await logAdminAction({
    actorId,
    actorRole,
    action: isNowReleased ? "access_info.release" : "access_info.update",
    targetType: "access_information",
    targetId: existing.id,
    oldValue: { visibleToClient: existing.visibleToClient },
    newValue: { visibleToClient: updated.visibleToClient },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const actorId = (session.user as { id: string }).id;
  const actorRole = (session.user as { role: string }).role;

  try {
    await requireCapability(actorId, "send_access_info");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const existing = await prisma.accessInformation.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  await prisma.accessInformation.delete({ where: { id: existing.id } });

  await logAdminAction({
    actorId,
    actorRole,
    action: "access_info.delete",
    targetType: "access_information",
    targetId: existing.id,
    oldValue: { title: existing.title },
  });

  return NextResponse.json({ ok: true });
}
