import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  if (user.verificationStatus === "VERIFIED") {
    return NextResponse.json({ error: "Votre identité est déjà vérifiée." }, { status: 400 });
  }

  const { phone, country, documentType, documentKey, locationConsent } = (await req.json().catch(() => ({}))) as {
    phone?: string;
    country?: string;
    documentType?: "NATIONAL_ID" | "PASSPORT" | "OTHER";
    documentKey?: string;
    locationConsent?: boolean;
  };

  if (!phone || !country || !documentType) {
    return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
  }
  if (locationConsent !== true) {
    return NextResponse.json({ error: "Votre accord pour le partage de votre localisation est requis." }, { status: 400 });
  }

  const existingPending = await prisma.verificationRequest.findFirst({
    where: { userId, status: "PENDING" },
  });
  if (existingPending) {
    return NextResponse.json({ error: "Une demande est déjà en cours de traitement." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { phone, country, verificationStatus: "PENDING", locationConsent: true, locationConsentAt: new Date() },
    }),
    // fileUrl contient la clé S3 (bucket privé) renvoyée par /api/uploads/identity-document —
    // jamais une URL publique. Si aucun fichier n'a été réellement téléversé (ex: stockage
    // cloud non configuré côté serveur), on retombe sur un marqueur explicite plutôt que de
    // prétendre qu'un document existe.
    prisma.identityDocument.create({
      data: {
        userId,
        documentType,
        side: "SINGLE",
        fileUrl: documentKey || "pending-upload://no-file-provided",
        status: "PENDING",
      },
    }),
    prisma.verificationRequest.create({
      data: { userId, status: "PENDING" },
    }),
  ]);

  const reviewers = await prisma.user.findMany({
    where: { role: { name: { in: ["SUPER_ADMIN", "MANAGER"] } } },
    select: { id: true },
  });
  await prisma.notification.createMany({
    data: reviewers.map((r) => ({
      userId: r.id,
      type: "verification_submitted",
      title: "Nouvelle demande de vérification",
      body: `${user.firstName} ${user.lastName} a soumis son dossier de vérification.`,
      link: "/manager/verifications",
    })),
  });

  return NextResponse.json({ ok: true });
}
