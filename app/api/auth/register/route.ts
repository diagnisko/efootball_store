import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates";

export async function POST(req: Request) {
  const body = await req.json();
  const { firstName, lastName, email, password } = body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  };

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères." },
      { status: 400 }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    // Message volontairement générique pour ne pas confirmer l'existence d'un compte à un tiers.
    return NextResponse.json(
      { error: "Impossible de créer ce compte avec ces informations." },
      { status: 400 }
    );
  }

  const clientRole = await prisma.role.findUnique({ where: { name: "CLIENT" } });
  if (!clientRole) {
    return NextResponse.json({ error: "Configuration serveur invalide." }, { status: 500 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email: normalizedEmail,
      passwordHash,
      roleId: clientRole.id,
      authProvider: "CREDENTIALS",
      verificationStatus: "NOT_SUBMITTED",
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "welcome",
      title: "Bienvenue sur VANTA",
      body: "Complétez votre profil et vérifiez votre identité pour débloquer les achats.",
    },
  });

  await sendEmail({ to: user.email, ...welcomeEmail(user.firstName) });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
