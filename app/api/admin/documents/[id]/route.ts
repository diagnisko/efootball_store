import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { presignPrivateDownload, StorageNotConfiguredError } from "@/lib/storage";
import { logAdminAction } from "@/lib/admin-log";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const actorId = (session.user as { id: string }).id;
  const actorRole = (session.user as { role: string }).role;

  try {
    await requireCapability(actorId, "view_id_documents");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const doc = await prisma.identityDocument.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });

  if (doc.fileUrl.startsWith("pending-upload://")) {
    return NextResponse.json(
      { error: "Aucun fichier réel n'a été téléversé pour ce document (marqueur de test)." },
      { status: 404 }
    );
  }

  try {
    // doc.fileUrl contient la clé S3 (bucket privé), jamais une URL publique — voir lib/storage.ts.
    const signedUrl = await presignPrivateDownload(doc.fileUrl, 300);

    // Chaque consultation d'une pièce d'identité est journalisée : c'est une donnée sensible
    // (section 26 et 29 du cahier des charges).
    await logAdminAction({
      actorId,
      actorRole,
      action: "identity_document.view",
      targetType: "identity_document",
      targetId: doc.id,
    });

    return NextResponse.redirect(signedUrl);
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 501 });
    }
    return NextResponse.json({ error: "Impossible de générer le lien de consultation." }, { status: 500 });
  }
}
