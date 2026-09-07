import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireCapability } from "@/lib/permissions";
import { createProductMediaUploadPost, StorageNotConfiguredError, uploadProductMedia } from "@/lib/storage";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  try {
    await requireCapability(userId, "manage_offers");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  if (req.headers.get("content-type")?.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
    }
    try {
      const result = await uploadProductMedia(file.name, file.type, new Uint8Array(await file.arrayBuffer()));
      return NextResponse.json(result);
    } catch (e) {
      if (e instanceof StorageNotConfiguredError) {
        return NextResponse.json({ error: e.message }, { status: 501 });
      }
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
    const result = await createProductMediaUploadPost(fileName, contentType);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 501 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur." }, { status: 400 });
  }
}
