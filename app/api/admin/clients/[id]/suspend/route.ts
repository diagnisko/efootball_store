import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { logAdminAction } from "@/lib/admin-log";
import { sendEmail } from "@/lib/email";
import { accountSuspendedEmail, accountReactivatedEmail } from "@/lib/email-templates";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const actorId = (session.user as { id: string }).id;
  const actorRole = (session.user as { role: string }).role;

  try {
    await requireCapability(actorId, "suspend_client");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const { action } = (await req.json().catch(() => ({}))) as { action?: "suspend" | "reactivate" };
  if (!action || !["suspend", "reactivate"].includes(action)) {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  const client = await prisma.user.findUnique({ where: { id: params.id }, include: { role: true } });
  if (!client || client.role.name !== "CLIENT") {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  const newStatus = action === "suspend" ? "SUSPENDED" : "ACTIVE";

  await prisma.$transaction([
    prisma.user.update({ where: { id: client.id }, data: { accountStatus: newStatus } }),
    prisma.notification.create({
      data: {
        userId: client.id,
        type: action === "suspend" ? "account_suspended" : "account_reactivated",
        title: action === "suspend" ? "Compte suspendu" : "Compte réactivé",
        body:
          action === "suspend"
            ? "Votre compte a été suspendu par l'administration. Contactez le support pour plus d'informations."
            : "Votre compte a été réactivé. Vous pouvez à nouveau vous connecter normalement.",
      },
    }),
  ]);

  await logAdminAction({
    actorId,
    actorRole,
    action: action === "suspend" ? "client.suspend" : "client.reactivate",
    targetType: "user",
    targetId: client.id,
    oldValue: { accountStatus: client.accountStatus },
    newValue: { accountStatus: newStatus },
  });

  await sendEmail({
    to: client.email,
    ...(action === "suspend"
      ? accountSuspendedEmail(client.firstName, "décision de l'administration")
      : accountReactivatedEmail(client.firstName)),
  });

  return NextResponse.json({ ok: true });
}
