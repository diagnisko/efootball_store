import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProductMediaDownloadUrl } from "@/lib/storage";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
  if (!user?.avatarUrl) return new NextResponse(null, { status: 404 });

  const url = await getProductMediaDownloadUrl(user.avatarUrl);
  return NextResponse.redirect(url, { status: 307 });
}