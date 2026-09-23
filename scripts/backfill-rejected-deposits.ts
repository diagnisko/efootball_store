import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const applyChanges = process.argv.includes("--apply");

async function main() {
  const rejectedPlans = await prisma.paymentPlan.findMany({
    where: {
      initialDepositStatus: "REJECTED",
      OR: [
        { status: { not: "CANCELLED" } },
        { purchase: { status: { not: "CANCELLED" } } },
        { purchase: { product: { status: "IN_PROGRESS" } } },
      ],
    },
    select: {
      id: true,
      purchase: {
        select: {
          id: true,
          status: true,
          productId: true,
          product: { select: { title: true, status: true } },
        },
      },
    },
  });

  let updated = 0;
  for (const plan of rejectedPlans) {
    const activePurchase = await prisma.purchase.findFirst({
      where: {
        productId: plan.purchase.productId,
        status: { in: ["ACTIVE", "COMPLETED"] },
        id: { not: plan.purchase.id },
      },
      select: { id: true },
    });
    const shouldReleaseProduct = !activePurchase && plan.purchase.product.status === "IN_PROGRESS";
    const productStatus = shouldReleaseProduct ? "AVAILABLE" : plan.purchase.product.status;

    console.log(
      `${applyChanges ? "CORRECTION" : "SIMULATION"} ${plan.purchase.product.title}: ` +
      `achat ${plan.purchase.status} -> CANCELLED, produit ${plan.purchase.product.status} -> ${productStatus}`
    );

    if (!applyChanges) continue;

    await prisma.$transaction([
      prisma.paymentPlan.update({ where: { id: plan.id }, data: { status: "CANCELLED" } }),
      prisma.purchase.update({ where: { id: plan.purchase.id }, data: { status: "CANCELLED" } }),
      ...(!shouldReleaseProduct
        ? []
        : [prisma.product.update({ where: { id: plan.purchase.productId }, data: { status: "AVAILABLE" } })]),
    ]);
    updated++;
  }

  console.log(`${applyChanges ? "Régularisation terminée" : "Simulation terminée"} : ${updated} cas modifié(s).`);
  if (!applyChanges && rejectedPlans.length > 0) {
    console.log("Pour appliquer ces changements : npx tsx scripts/backfill-rejected-deposits.ts --apply");
  }
}

main()
  .catch((error) => {
    console.error("Régularisation annulée :", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());