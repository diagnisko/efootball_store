import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { logAdminAction } from "@/lib/admin-log";
import { slugify } from "@/lib/slugify";

interface MediaInput {
  mediaType: "IMAGE" | "VIDEO" | "THUMBNAIL";
  url: string;
  isMain?: boolean;
  position?: number;
}

interface ProductInput {
  title: string;
  description: string;
  priceTotal: number;
  initialDepositAmount: number;
  installmentsCount?: number;
  status?: "AVAILABLE" | "IN_PROGRESS" | "SOLD" | "HIDDEN";
  featured?: boolean;
  importantInfo?: string;
  features?: { ovr?: number; platform?: string; coins?: number; division?: number };
  media?: MediaInput[];
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const actorId = (session.user as { id: string }).id;
  const actorRole = (session.user as { role: string }).role;

  try {
    await requireCapability(actorId, "manage_offers");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as ProductInput | null;
  if (!body?.title || !body.description || body.priceTotal == null || body.initialDepositAmount == null) {
    return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
  }
  if (body.initialDepositAmount >= body.priceTotal) {
    return NextResponse.json(
      { error: "L'apport initial doit être inférieur au prix total." },
      { status: 400 }
    );
  }

  let slug = slugify(body.title);
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const product = await prisma.product.create({
    data: {
      title: body.title,
      slug,
      description: body.description,
      priceTotal: body.priceTotal,
      initialDepositAmount: body.initialDepositAmount,
      installmentsCount: body.installmentsCount ?? 8,
      status: body.status ?? "AVAILABLE",
      featured: body.featured ?? false,
      importantInfo: body.importantInfo || null,
      features: body.features ?? undefined,
      createdBy: actorId,
      media: body.media?.length
        ? {
            create: body.media.map((m, i) => ({
              mediaType: m.mediaType,
              url: m.url,
              isMain: m.isMain ?? i === 0,
              position: m.position ?? i,
            })),
          }
        : undefined,
    },
  });

  await logAdminAction({
    actorId,
    actorRole,
    action: "offer.create",
    targetType: "product",
    targetId: product.id,
    newValue: { title: product.title, status: product.status },
  });

  return NextResponse.json({ id: product.id, slug: product.slug }, { status: 201 });
}
