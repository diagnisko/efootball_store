import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, title: true, body: true, link: true, isRead: true, createdAt: true },
  });

  return NextResponse.json({
    notifications: notifications.map((notification) => ({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = (await req.json().catch(() => ({}))) as { ids?: string[]; markRead?: boolean };
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];

  if (!ids.length) {
    return NextResponse.json({ error: "Aucune notification sélectionnée." }, { status: 400 });
  }

  if (body.markRead) {
    await prisma.notification.updateMany({
      where: { userId, id: { in: ids } },
      data: { isRead: true },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];

  if (!ids.length) {
    return NextResponse.json({ error: "Aucune notification sélectionnée." }, { status: 400 });
  }

  const result = await prisma.notification.deleteMany({
    where: { userId, id: { in: ids } },
  });

  return NextResponse.json({ deleted: result.count });
}
