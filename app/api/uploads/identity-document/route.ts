import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createIdentityDocumentUploadPost, StorageNotConfiguredError, uploadIdentityDocument } from "@/lib/storage";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  if (req.headers.get("content-type")?.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
    try {
      return NextResponse.json(await uploadIdentityDocument(userId, file.name, file.type, new Uint8Array(await file.arrayBuffer())));
    } catch (e) {
      if (e instanceof StorageNotConfiguredError) return NextResponse.json({ error: e.message }, { status: 501 });
      return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur d'upload." }, { status: 400 });
    }
  }

  const { fileName, contentType } = (await req.json().catch(() => ({}))) as {
    fileName?: string;
    contentType?: string;
  };
  if (!fileName || !contentType) {
    return NextResponse.json({ error: "Nom de fichier et type MIME requis." }, { status: 400 });
  }

  try {
    const result = await createIdentityDocumentUploadPost(userId, fileName, contentType);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 501 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur." }, { status: 400 });
  }
}
