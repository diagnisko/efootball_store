import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { logAdminAction } from "@/lib/admin-log";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const actorId = (session.user as { id: string }).id;
  const actorRole = (session.user as { role: string }).role;

  try {
    await requireCapability(actorId, "send_access_info");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const { purchaseId, title, content } = (await req.json().catch(() => ({}))) as {
    purchaseId?: string;
    title?: string;
    content?: string;
  };
  if (!purchaseId || !title || !content) {
    return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
  }

  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return NextResponse.json({ error: "Achat introuvable." }, { status: 404 });

  // Créée non visible par défaut : la remise au client est un acte volontaire et distinct
  // (voir PATCH /api/admin/access-info/[id]), jamais automatique — section 17-18 du cahier
  // des charges.
  const info = await prisma.accessInformation.create({
    data: {
      purchaseId,
      title,
      content,
      visibleToClient: false,
      createdBy: actorId,
    },
  });

  await logAdminAction({
    actorId,
    actorRole,
    action: "access_info.create",
    targetType: "purchase",
    targetId: purchaseId,
    newValue: { title },
  });

  return NextResponse.json({ id: info.id }, { status: 201 });
}
