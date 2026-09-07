import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCapability } from "@/lib/permissions";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const conversation = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!conversation) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const isClient = conversation.clientId === userId;
  const isStaff = !isClient && (await hasCapability(userId, "reply_messages"));
  if (!isClient && !isStaff) return NextResponse.json({ error: "Non autorisé." }, { status: 403 });

  await prisma.message.updateMany({
    where: { conversationId: conversation.id, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
