import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidateTag } from "next/cache";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = (await req.json().catch(() => ({}))) as {
    firstName?: string;
    lastName?: string;
    phone?: string;
    country?: string;
    avatarUrl?: string;
  };

  if (body.firstName !== undefined && !body.firstName.trim()) {
    return NextResponse.json({ error: "Le prénom ne peut pas être vide." }, { status: 400 });
  }
  if (body.lastName !== undefined && !body.lastName.trim()) {
    return NextResponse.json({ error: "Le nom ne peut pas être vide." }, { status: 400 });
  }

  // Volontairement : ni email, ni rôle, ni verificationStatus, ni accountStatus ne sont
  // acceptés ici, même si le corps de la requête en contient — cette route ne touche qu'aux
  // informations personnelles non sensibles.
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: body.firstName?.trim() || undefined,
      lastName: body.lastName?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
      country: body.country?.trim() || undefined,
      avatarUrl: body.avatarUrl || undefined,
    },
    select: { firstName: true, lastName: true, phone: true, country: true, avatarUrl: true },
  });

  revalidateTag("nav-user");

  return NextResponse.json(updated);
}

export async function PUT(req: Request) {
  // Changement de mot de passe — méthode distincte pour ne jamais mélanger avec la mise à
  // jour de profil, et pour exiger explicitement le mot de passe actuel.
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { currentPassword, newPassword } = (await req.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "Ce compte utilise une connexion Google/Apple, pas de mot de passe à changer ici." },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

  return NextResponse.json({ ok: true });
}
