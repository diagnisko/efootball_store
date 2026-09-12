import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProductMediaDownloadUrl } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const media = await prisma.productMedia.findUnique({ where: { id: params.id } });
  if (!media) return NextResponse.json({ error: "Média introuvable." }, { status: 404 });

  const targetUrl = media.url.startsWith("http://") || media.url.startsWith("https://")
    ? media.url
    : await getProductMediaDownloadUrl(media.url);

  return NextResponse.redirect(targetUrl, { status: 307 });
}