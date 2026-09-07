import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-log";
import type { Capability } from "@/lib/permissions";

const VALID_CAPABILITIES: Capability[] = [
  "view_clients",
  "verify_identity",
  "reject_identity",
  "view_id_documents",
  "confirm_payment",
  "reject_payment",
  "manage_offers",
  "reply_messages",
  "view_statistics",
];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const actorRole = (session.user as { role: string }).role;
  const actorId = (session.user as { id: string }).id;
  if (actorRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Réservé au Super Admin." }, { status: 403 });
  }

  const { capability, granted } = (await req.json().catch(() => ({}))) as {
    capability?: Capability;
    granted?: boolean;
  };
  if (!capability || !VALID_CAPABILITIES.includes(capability) || typeof granted !== "boolean") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const manager = await prisma.user.findUnique({ where: { id: params.id }, include: { role: true } });
  if (!manager || manager.role.name !== "MANAGER") {
    return NextResponse.json({ error: "Manager introuvable." }, { status: 404 });
  }

  const existing = await prisma.managerPermission.findUnique({
    where: { userId_capability: { userId: manager.id, capability } },
  });

  await prisma.managerPermission.upsert({
    where: { userId_capability: { userId: manager.id, capability } },
    update: { granted, grantedBy: actorId, grantedAt: new Date() },
    create: { userId: manager.id, capability, granted, grantedBy: actorId },
  });

  await logAdminAction({
    actorId,
    actorRole,
    action: "manager.permission.update",
    targetType: "user",
    targetId: manager.id,
    oldValue: { capability, granted: existing?.granted ?? false },
    newValue: { capability, granted },
  });

  return NextResponse.json({ ok: true });
}
