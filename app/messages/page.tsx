import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MessageThread } from "@/components/MessageThread";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;

  const conversation = await prisma.conversation.findFirst({
    where: { clientId: userId },
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" }, include: { sender: true } } },
  });

  const messages = (conversation?.messages ?? []).map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    senderId: m.senderId,
    senderName: `${m.sender.firstName} ${m.sender.lastName}`,
    isMine: m.senderId === userId,
    hasAttachment: !!m.attachmentUrl,
  }));

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <h2>Mes messages</h2>
          <p>Une question sur votre achat ou votre dossier ? Écrivez à l&apos;équipe VANTA.</p>
        </div>
      </div>
      <MessageThread
        conversationId={conversation?.id ?? null}
        initialMessages={messages}
        currentUserId={userId}
        mode="client"
      />
    </div>
  );
}
