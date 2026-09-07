import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createMessageAttachmentUploadPost, StorageNotConfiguredError } from "@/lib/storage";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { fileName, contentType } = (await req.json().catch(() => ({}))) as {
    fileName?: string;
    contentType?: string;
  };
  if (!fileName || !contentType) {
    return NextResponse.json({ error: "Nom de fichier et type MIME requis." }, { status: 400 });
  }

  try {
    const result = await createMessageAttachmentUploadPost(userId, fileName, contentType);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 501 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur." }, { status: 400 });
  }
}
