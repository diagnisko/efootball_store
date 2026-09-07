import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCapability } from "@/lib/permissions";
import { presignPrivateDownload, StorageNotConfiguredError } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: { messageId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const message = await prisma.message.findUnique({
    where: { id: params.messageId },
    include: { conversation: true },
  });
  if (!message) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  if (!message.attachmentUrl) return NextResponse.json({ error: "Aucune pièce jointe." }, { status: 404 });

  const isParticipantClient = message.conversation.clientId === userId;
  const isStaff = !isParticipantClient && (await hasCapability(userId, "reply_messages"));
  if (!isParticipantClient && !isStaff) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  try {
    const signedUrl = await presignPrivateDownload(message.attachmentUrl, 300);
    return NextResponse.redirect(signedUrl);
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 501 });
    }
    return NextResponse.json({ error: "Impossible de générer le lien de consultation." }, { status: 500 });
  }
}
