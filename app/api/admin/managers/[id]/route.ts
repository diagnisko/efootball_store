import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if ((session.user as { role?: string }).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Réservé au Super Admin." }, { status: 403 });
  }

  const manager = await prisma.user.findUnique({ where: { id: params.id }, include: { role: true } });
  if (!manager || manager.role.name !== "MANAGER") {
    return NextResponse.json({ error: "Manager introuvable." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { userId: manager.id } });
    await tx.managerPermission.deleteMany({ where: { userId: manager.id } });
    await tx.message.deleteMany({ where: { senderId: manager.id } });
    await tx.verificationCodeRequest.deleteMany({ where: { OR: [{ requestedBy: manager.id }, { providedBy: manager.id }] } });
    await tx.user.delete({ where: { id: manager.id } });
  });

  return NextResponse.json({ ok: true });
}
