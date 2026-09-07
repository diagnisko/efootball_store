import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  OPEN: { label: "Ouvert", className: "badge-warn" },
  RESOLVED: { label: "Traité", className: "badge-ok" },
  ARCHIVED: { label: "Archivé", className: "badge-muted" },
};

export default async function ManagerMessagesPage() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { lastMessageAt: "desc" },
    include: {
      client: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
  });

  const unreadCounts = await prisma.message.groupBy({
    by: ["conversationId"],
    where: { readAt: null, sender: { role: { name: "CLIENT" } } },
    _count: { _all: true },
  });
  const unreadMap = new Map(unreadCounts.map((u) => [u.conversationId, u._count._all]));

  return (
    <div>
      <div className="bo-page-header">
        <div>
          <h1>Conversations</h1>
          <p>{conversations.length} conversation{conversations.length > 1 ? "s" : ""} avec des clients.</p>
        </div>
      </div>

      <div className="bo-panel bo-panel-pad bo-table-wrap">
        {conversations.length === 0 && <div className="bo-empty">Aucune conversation pour le moment.</div>}
        {conversations.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Dernier message</th>
                <th>Statut</th>
                <th>Non lus</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((c) => {
                const status = STATUS_LABEL[c.status] ?? STATUS_LABEL.OPEN;
                const unread = unreadMap.get(c.id) ?? 0;
                return (
                  <tr key={c.id}>
                    <td>{c.client.firstName} {c.client.lastName}</td>
                    <td style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--bo-muted)", fontSize: 13 }}>
                      {c.messages[0]?.content ?? "—"}
                    </td>
                    <td><span className={`badge ${status.className}`}>{status.label}</span></td>
                    <td>{unread > 0 && <span className="badge badge-danger">{unread}</span>}</td>
                    <td><Link href={`/manager/messages/${c.id}`} className="bo-btn bo-btn-sm">Ouvrir</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
