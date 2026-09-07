import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCapability } from "@/lib/permissions";
import { sendEmail } from "@/lib/email";
import { newMessageEmail } from "@/lib/email-templates";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;

  const { content, conversationId, attachmentKey } = (await req.json().catch(() => ({}))) as {
    content?: string;
    conversationId?: string;
    attachmentKey?: string;
  };
  if (!content?.trim() && !attachmentKey) {
    return NextResponse.json({ error: "Le message ne peut pas être vide." }, { status: 400 });
  }

  let conversation;

  if (role === "CLIENT") {
    // Le client n'a besoin de connaître aucun ID : on retrouve sa conversation ou on en crée une.
    conversation =
      (await prisma.conversation.findFirst({ where: { clientId: userId }, orderBy: { createdAt: "desc" } })) ??
      (await prisma.conversation.create({ data: { clientId: userId, status: "OPEN" } }));
  } else {
    if (!conversationId) {
      return NextResponse.json({ error: "Conversation cible manquante." }, { status: 400 });
    }
    const allowed = await hasCapability(userId, "reply_messages");
    if (!allowed) return NextResponse.json({ error: "Permission refusée." }, { status: 403 });

    conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: userId,
      content: content?.trim() || (attachmentKey ? "📎 Pièce jointe" : ""),
      attachmentUrl: attachmentKey || null,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), status: "OPEN" },
  });

  if (role === "CLIENT") {
    const reviewers = await prisma.user.findMany({
      where: { role: { name: { in: ["SUPER_ADMIN", "MANAGER"] } } },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: reviewers.map((r) => ({
        userId: r.id,
        type: "new_message",
        title: "Nouveau message",
        body: "Un client a envoyé un nouveau message.",
        link: `/manager/messages/${conversation!.id}`,
      })),
    });
  } else {
    await prisma.notification.create({
      data: {
        userId: conversation.clientId,
        type: "new_message",
        title: "Nouveau message de l'équipe VANTA",
        body: "Vous avez reçu une réponse à votre message.",
        link: "/messages",
      },
    });
    const client = await prisma.user.findUnique({ where: { id: conversation.clientId } });
    if (client) {
      await sendEmail({ to: client.email, ...newMessageEmail(client.firstName) });
    }
  }

  return NextResponse.json({ conversationId: conversation.id, messageId: message.id }, { status: 201 });
}
