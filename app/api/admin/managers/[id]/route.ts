import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const actorRole = (session.user as { role?: string }).role;
  const actorId = (session.user as { id?: string }).id;
  if (actorRole !== "SUPER_ADMIN" || !actorId) {
    return NextResponse.json({ error: "Réservé au Super Admin." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const providedPassword = body.password?.trim() ?? "";
  if (!providedPassword) {
    return NextResponse.json({ error: "Mot de passe admin requis." }, { status: 400 });
  }

  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor?.passwordHash) {
    return NextResponse.json({ error: "Compte admin invalide." }, { status: 403 });
  }

  const passwordValid = await bcrypt.compare(providedPassword, actor.passwordHash);
  if (!passwordValid) {
    return NextResponse.json({ error: "Mot de passe admin incorrect." }, { status: 401 });
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
