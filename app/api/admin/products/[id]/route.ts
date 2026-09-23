import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { logAdminAction } from "@/lib/admin-log";
import { slugify } from "@/lib/slugify";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

interface MediaInput {
  mediaType: "IMAGE" | "VIDEO" | "THUMBNAIL";
  url: string;
  isMain?: boolean;
  position?: number;
}

interface ProductInput {
  title?: string;
  description?: string;
  priceTotal?: number;
  initialDepositAmount?: number;
  installmentsCount?: number;
  status?: "AVAILABLE" | "IN_PROGRESS" | "SOLD" | "HIDDEN";
  featured?: boolean;
  importantInfo?: string;
  features?: { ovr?: number; platform?: string; coins?: number; division?: number };
  media?: MediaInput[];
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const actorId = (session.user as { id: string }).id;
  const actorRole = (session.user as { role: string }).role;

  try {
    await requireCapability(actorId, "manage_offers");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const existing = await prisma.product.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });

  const body = (await req.json().catch(() => null)) as ProductInput | null;
  if (!body) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  if (
    body.priceTotal != null &&
    body.initialDepositAmount != null &&
    body.initialDepositAmount >= body.priceTotal
  ) {
    return NextResponse.json(
      { error: "L'apport initial doit être inférieur au prix total." },
      { status: 400 }
    );
  }

  let slug = existing.slug;
  if (body.title && body.title !== existing.title) {
    slug = slugify(body.title);
    const clash = await prisma.product.findFirst({ where: { slug, NOT: { id: existing.id } } });
    if (clash) slug = `${slug}-${Date.now().toString(36)}`;
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.product.update({
      where: { id: existing.id },
      data: {
        title: body.title ?? undefined,
        slug,
        description: body.description ?? undefined,
        priceTotal: body.priceTotal ?? undefined,
        initialDepositAmount: body.initialDepositAmount ?? undefined,
        installmentsCount: body.installmentsCount ?? undefined,
        status: body.status ?? undefined,
        featured: body.featured ?? undefined,
        importantInfo: body.importantInfo ?? undefined,
        features: body.features ?? undefined,
      },
    }),
  ];

  // Remplacement complet des médias si un tableau est fourni (approche simple et prévisible
  // pour une UI d'admin — pas de diff fin ligne à ligne).
  if (body.media) {
    ops.push(
      prisma.productMedia.deleteMany({ where: { productId: existing.id } }),
      prisma.productMedia.createMany({
        data: body.media.map((m, i) => ({
          productId: existing.id,
          mediaType: m.mediaType,
          url: m.url,
          isMain: m.isMain ?? i === 0,
          position: m.position ?? i,
        })),
      })
    );
  }

  await prisma.$transaction(ops);

  await logAdminAction({
    actorId,
    actorRole,
    action: "offer.update",
    targetType: "product",
    targetId: existing.id,
    oldValue: { title: existing.title, status: existing.status },
    newValue: { title: body.title ?? existing.title, status: body.status ?? existing.status },
  });

  revalidateTag("public-catalog");

  return NextResponse.json({ ok: true, slug });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const actorId = (session.user as { id: string }).id;
  const actorRole = (session.user as { role: string }).role;

  try {
    await requireCapability(actorId, "delete_offers");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const { password } = (await _req.json().catch(() => ({}))) as { password?: string };
  if (!password) {
    return NextResponse.json({ error: "Mot de passe administrateur requis." }, { status: 400 });
  }
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { passwordHash: true } });
  if (!actor?.passwordHash || !(await bcrypt.compare(password, actor.passwordHash))) {
    return NextResponse.json({ error: "Mot de passe administrateur incorrect." }, { status: 403 });
  }

  const existing = await prisma.product.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });

  const validPurchaseCount = await prisma.purchase.count({
    where: {
      productId: existing.id,
      status: { in: ["ACTIVE", "COMPLETED"] },
      paymentPlan: { initialDepositStatus: "PAID" },
    },
  });
  if (validPurchaseCount > 0) {
    return NextResponse.json(
      {
        error:
          "Cette offre a un achat validé et ne peut pas être supprimée. Masquez-la plutôt.",
      },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const purchases = await tx.purchase.findMany({
      where: { productId: existing.id },
      select: { id: true },
    });
    const purchaseIds = purchases.map((purchase) => purchase.id);

    if (purchaseIds.length > 0) {
      await tx.verificationCodeRequest.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
      await tx.accessInformation.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
    }

    const plans = await tx.paymentPlan.findMany({
      where: { purchaseId: { in: purchaseIds } },
      select: { id: true },
    });
    const planIds = plans.map((plan) => plan.id);
    const schedules = await tx.paymentSchedule.findMany({
      where: { paymentPlanId: { in: planIds } },
      select: { id: true },
    });
    const scheduleIds = schedules.map((schedule) => schedule.id);

    if (planIds.length > 0 || scheduleIds.length > 0) {
      const submissions = await tx.paymentSubmission.findMany({
        where: {
          OR: [
            ...(planIds.length > 0 ? [{ paymentPlanId: { in: planIds } }] : []),
            ...(scheduleIds.length > 0 ? [{ paymentScheduleId: { in: scheduleIds } }] : []),
          ],
        },
        select: { id: true },
      });
      const submissionIds = submissions.map((submission) => submission.id);
      if (submissionIds.length > 0) {
        await tx.paymentConfirmation.deleteMany({ where: { paymentSubmissionId: { in: submissionIds } } });
        await tx.paymentSubmission.deleteMany({ where: { id: { in: submissionIds } } });
      }
      if (planIds.length > 0) {
        await tx.paymentSchedule.deleteMany({ where: { paymentPlanId: { in: planIds } } });
        await tx.paymentPlan.deleteMany({ where: { id: { in: planIds } } });
      }
    }

    if (purchaseIds.length > 0) {
      await tx.purchase.deleteMany({ where: { id: { in: purchaseIds } } });
    }
    await tx.productMedia.deleteMany({ where: { productId: existing.id } });
    await tx.product.delete({ where: { id: existing.id } });
  });

  await logAdminAction({
    actorId,
    actorRole,
    action: "offer.delete",
    targetType: "product",
    targetId: existing.id,
    oldValue: { title: existing.title },
  });

  revalidateTag("public-catalog");

  return NextResponse.json({ ok: true });
}
