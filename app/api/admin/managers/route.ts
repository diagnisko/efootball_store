import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if ((session.user as { role?: string }).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Réservé au Super Admin." }, { status: 403 });
  }

  const managers = await prisma.user.findMany({
    where: { role: { name: "MANAGER" } },
    orderBy: { firstName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ managers });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if ((session.user as { role?: string }).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Réservé au Super Admin." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  };

  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Un compte avec cet email existe déjà." }, { status: 400 });
  }

  const managerRole = await prisma.role.findUnique({ where: { name: "MANAGER" } });
  if (!managerRole) {
    return NextResponse.json({ error: "Rôle manager introuvable." }, { status: 500 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const manager = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash,
      roleId: managerRole.id,
      authProvider: "CREDENTIALS",
      verificationStatus: "NOT_SUBMITTED",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId: manager.id,
      type: "account_created",
      title: "Compte manager créé",
      body: "Votre accès à la supervision a été activé. Connectez-vous pour commencer.",
      link: "/manager/verifications",
    },
  });

  return NextResponse.json({ manager }, { status: 201 });
}
