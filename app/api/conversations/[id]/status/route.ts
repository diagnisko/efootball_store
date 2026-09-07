import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { logAdminAction } from "@/lib/admin-log";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const actorId = (session.user as { id: string }).id;
  const actorRole = (session.user as { role: string }).role;

  try {
    await requireCapability(actorId, "reply_messages");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const { status } = (await req.json().catch(() => ({}))) as { status?: "OPEN" | "ARCHIVED" | "RESOLVED" };
  if (!status || !["OPEN", "ARCHIVED", "RESOLVED"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  const existing = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  await prisma.conversation.update({
    where: { id: params.id },
    data: { status, assignedTo: actorId },
  });

  await logAdminAction({
    actorId,
    actorRole,
    action: "conversation.status_update",
    targetType: "conversation",
    targetId: params.id,
    oldValue: { status: existing.status },
    newValue: { status },
  });

  return NextResponse.json({ ok: true });
}
