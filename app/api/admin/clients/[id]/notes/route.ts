import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const authorId = (session.user as { id: string }).id;

  try {
    await requireCapability(authorId, "view_clients");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const { content } = (await req.json().catch(() => ({}))) as { content?: string };
  if (!content?.trim()) {
    return NextResponse.json({ error: "La note ne peut pas être vide." }, { status: 400 });
  }

  const client = await prisma.user.findUnique({ where: { id: params.id }, include: { role: true } });
  if (!client || client.role.name !== "CLIENT") {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  const note = await prisma.clientNote.create({
    data: { clientId: client.id, authorId, content: content.trim() },
  });

  return NextResponse.json({ id: note.id }, { status: 201 });
}
