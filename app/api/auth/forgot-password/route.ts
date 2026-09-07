import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email-templates";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

export async function POST(req: Request) {
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };

  // Réponse toujours identique, que l'email existe ou non — section 6.11 du cahier des
  // charges : "Ne jamais révéler publiquement si une adresse email est enregistrée ou non."
  const genericResponse = NextResponse.json({
    ok: true,
    message: "Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.",
  });

  if (!email) return genericResponse;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  // Un compte OAuth pur (Google/Apple, sans mot de passe local) n'a rien à réinitialiser.
  if (!user || !user.passwordHash) return genericResponse;

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`;
  await sendEmail({ to: user.email, ...passwordResetEmail(user.firstName, resetUrl) });

  return genericResponse;
}
