import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MessageThread } from "@/components/MessageThread";
import { ConversationStatusActions } from "@/components/ConversationStatusActions";

export const dynamic = "force-dynamic";

export default async function ManagerConversationPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session!.user as { id: string }).id;

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      messages: { orderBy: { createdAt: "asc" }, include: { sender: true } },
    },
  });
  if (!conversation) notFound();

  const messages = conversation.messages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    senderId: m.senderId,
    senderName: `${m.sender.firstName} ${m.sender.lastName}`,
    isMine: m.senderId === userId,
    hasAttachment: !!m.attachmentUrl,
  }));

  return (
    <div>
      <Link href="/manager/messages" className="link-arrow" style={{ display: "inline-block", marginBottom: 16 }}>
        ← Retour aux conversations
      </Link>
      <div className="bo-page-header">
        <div>
          <h1>{conversation.client.firstName} {conversation.client.lastName}</h1>
          <p>{conversation.client.email}</p>
        </div>
        <div className="bo-page-actions">
          <ConversationStatusActions conversationId={conversation.id} currentStatus={conversation.status} />
        </div>
      </div>
      <div className="bo-panel bo-panel-pad">
        <MessageThread
          conversationId={conversation.id}
          initialMessages={messages}
          currentUserId={userId}
          mode="staff"
        />
      </div>
    </div>
  );
}
