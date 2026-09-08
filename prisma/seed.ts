import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ---------- Rôles ----------
  const [clientRole, managerRole, superAdminRole] = await Promise.all([
    prisma.role.upsert({ where: { name: "CLIENT" }, update: {}, create: { name: "CLIENT", description: "Client" } }),
    prisma.role.upsert({ where: { name: "MANAGER" }, update: {}, create: { name: "MANAGER", description: "Manager" } }),
    prisma.role.upsert({ where: { name: "SUPER_ADMIN" }, update: {}, create: { name: "SUPER_ADMIN", description: "Super Admin" } }),
  ]);

  // ---------- Comptes de test ----------
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@vanta.app" },
    update: {},
    create: {
      firstName: "Admin",
      lastName: "VANTA",
      email: "admin@vanta.app",
      passwordHash,
      roleId: superAdminRole.id,
      verificationStatus: "VERIFIED",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@vanta.app" },
    update: {},
    create: {
      firstName: "Karim",
      lastName: "Diallo",
      email: "manager@vanta.app",
      passwordHash,
      roleId: managerRole.id,
      verificationStatus: "VERIFIED",
    },
  });
  await prisma.managerPermission.createMany({
    data: [
      { userId: manager.id, capability: "confirm_payment", granted: true, grantedBy: superAdmin.id },
      { userId: manager.id, capability: "reject_payment", granted: true, grantedBy: superAdmin.id },
      { userId: manager.id, capability: "verify_identity", granted: true, grantedBy: superAdmin.id },
      { userId: manager.id, capability: "reply_messages", granted: true, grantedBy: superAdmin.id },
    ],
    skipDuplicates: true,
  });

  // 40 clients vérifiés + 8 en attente, pour un total réaliste
  const clientEmails: string[] = [];
  for (let i = 1; i <= 40; i++) clientEmails.push(`client.verifie${i}@vanta.app`);
  for (let i = 1; i <= 8; i++) clientEmails.push(`client.attente${i}@vanta.app`);

  for (const email of clientEmails) {
    const isPending = email.includes("attente");
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        firstName: "Client",
        lastName: email.split("@")[0],
        email,
        passwordHash,
        roleId: clientRole.id,
        verificationStatus: isPending ? "PENDING" : "VERIFIED",
      },
    });
  }

  const demoClient = await prisma.user.upsert({
    where: { email: "amina@vanta.app" },
    update: {},
    create: {
      firstName: "Amina",
      lastName: "Ndiaye",
      email: "amina@vanta.app",
      passwordHash,
      roleId: clientRole.id,
      verificationStatus: "VERIFIED",
    },
  });

  // ---------- Produits (comptes eFootball Mobile) ----------
  const products = await Promise.all([
    prisma.product.upsert({
      where: { slug: "compte-prime-ovr-134" },
      update: {},
      create: {
        title: "Compte Prime Puissance 134",
        slug: "compte-prime-ovr-134",
        description: "5 icônes dont Zidane et Ronaldinho, effectif complet.",
        features: { platform: "Mobile", ovr: 134, coins: 1200000, division: 1 },
        priceTotal: 520000,
        initialDepositAmount: 104000,
        createdBy: superAdmin.id,
        status: "AVAILABLE",
        featured: true,
      },
    }),
    prisma.product.upsert({
      where: { slug: "compte-elite-ovr-131" },
      update: {},
      create: {
        title: "Compte Elite Puissance 131",
        slug: "compte-elite-ovr-131",
        description: "3 icônes, effectif Epic complet.",
        features: { platform: "Mobile", ovr: 131, coins: 640000, division: 2 },
        priceTotal: 410000,
        initialDepositAmount: 82000,
        createdBy: superAdmin.id,
        status: "IN_PROGRESS",
      },
    }),
    prisma.product.upsert({
      where: { slug: "compte-legends-ovr-126" },
      update: {},
      create: {
        title: "Compte Legends Puissance 126",
        slug: "compte-legends-ovr-126",
        description: "2 icônes, base solide pour progression.",
        features: { platform: "Mobile", ovr: 126, coins: 340000, division: 3 },
        priceTotal: 280000,
        initialDepositAmount: 56000,
        createdBy: superAdmin.id,
        status: "SOLD",
      },
    }),
    prisma.product.upsert({
      where: { slug: "compte-champion-ovr-129" },
      update: {},
      create: {
        title: "Compte Champion Puissance 129",
        slug: "compte-champion-ovr-129",
        description: "4 icônes, effectif Champion complet.",
        features: { platform: "Mobile", ovr: 129, coins: 520000, division: 2 },
        priceTotal: 360000,
        initialDepositAmount: 72000,
        createdBy: superAdmin.id,
        status: "IN_PROGRESS",
      },
    }),
  ]);

  const eliteAccount = products[1];
  const championAccount = products[3];

  // ---------- Achat démo pour amina@vanta.app sur le compte Elite ----------
  const existingPurchase = await prisma.purchase.findFirst({
    where: { userId: demoClient.id, productId: eliteAccount.id },
  });

  if (!existingPurchase) {
    const purchase = await prisma.purchase.create({
      data: {
        userId: demoClient.id,
        productId: eliteAccount.id,
        status: "ACTIVE",
        totalPrice: eliteAccount.priceTotal,
      },
    });

    const plan = await prisma.paymentPlan.create({
      data: {
        purchaseId: purchase.id,
        initialDepositAmount: eliteAccount.initialDepositAmount,
        initialDepositStatus: "PAID",
        remainingAmount: Number(eliteAccount.priceTotal) - Number(eliteAccount.initialDepositAmount),
        installmentsCount: 8,
        startDate: new Date("2026-05-12"),
        status: "ACTIVE",
      },
    });

    const monthlyAmount = (Number(eliteAccount.priceTotal) - Number(eliteAccount.initialDepositAmount)) / 8;
    const dueDates = [
      "2026-05-12", "2026-06-12", "2026-07-12", "2026-08-12",
      "2026-09-12", "2026-10-12", "2026-11-12", "2026-12-12",
    ];

    for (let i = 0; i < 8; i++) {
      const installmentNumber = i + 1;
      const dueDate = new Date(dueDates[i]);
      let status: "PAID" | "DUE" | "UPCOMING" = "UPCOMING";
      let paidAt: Date | null = null;

      if (installmentNumber <= 4) {
        status = "PAID";
        // 3 payées à l'heure, 1 payée avec 2 jours de retard -> alimente le taux réel "à temps"
        paidAt = installmentNumber === 3
          ? new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000)
          : dueDate;
      } else if (installmentNumber === 5) {
        status = "DUE";
      }

      await prisma.paymentSchedule.create({
        data: {
          paymentPlanId: plan.id,
          installmentNumber,
          dueDate,
          amount: monthlyAmount,
          status,
          paidAt,
        },
      });
    }
  }

  // ---------- Règle de retard par défaut ----------
  const existingRule = await prisma.latePaymentRule.findFirst();
  if (!existingRule) {
    await prisma.latePaymentRule.create({
      data: {
        gracePeriodDays: 3,
        penaltyType: "PERCENTAGE",
        penaltyValue: 5,
        maxLateDaysBeforeSuspension: 15,
        maxLateDaysBeforeCancellation: 45,
        updatedBy: superAdmin.id,
      },
    });
  }

  // ---------- Contenu de démo pour les files d'attente Manager ----------

  // 1) Une demande de vérification en attente (premier client "attente")
  const pendingClient = await prisma.user.findUnique({ where: { email: "client.attente1@vanta.app" } });
  if (pendingClient) {
    const existingRequest = await prisma.verificationRequest.findFirst({
      where: { userId: pendingClient.id, status: "PENDING" },
    });
    if (!existingRequest) {
      await prisma.verificationRequest.create({
        data: { userId: pendingClient.id, status: "PENDING" },
      });
    }
  }

  // 2) Un deuxième client avec un achat en attente de validation de l'apport initial
  const youssef = await prisma.user.upsert({
    where: { email: "youssef@vanta.app" },
    update: {},
    create: {
      firstName: "Youssef",
      lastName: "Camara",
      email: "youssef@vanta.app",
      passwordHash,
      roleId: clientRole.id,
      verificationStatus: "VERIFIED",
    },
  });
  const primeAccount = products[0];
  const existingYoussefPurchase = await prisma.purchase.findFirst({
    where: { userId: youssef.id, productId: primeAccount.id },
  });
  if (!existingYoussefPurchase) {
    const purchase = await prisma.purchase.create({
      data: {
        userId: youssef.id,
        productId: primeAccount.id,
        status: "AWAITING_DEPOSIT",
        totalPrice: primeAccount.priceTotal,
      },
    });
    const plan = await prisma.paymentPlan.create({
      data: {
        purchaseId: purchase.id,
        initialDepositAmount: primeAccount.initialDepositAmount,
        initialDepositStatus: "AWAITING_VALIDATION",
        remainingAmount: Number(primeAccount.priceTotal) - Number(primeAccount.initialDepositAmount),
        installmentsCount: 8,
        status: "PENDING_DEPOSIT",
      },
    });
    await prisma.paymentSubmission.create({
      data: {
        paymentPlanId: plan.id,
        userId: youssef.id,
        reference: "TXN-DEP-0472",
        comment: "Paiement effectué via Orange Money.",
        status: "PENDING",
      },
    });
  }

  // 3) L'échéance n°5 d'Amina déclarée, en attente de validation
  const aminaPurchase = await prisma.purchase.findFirst({
    where: { userId: demoClient.id, productId: eliteAccount.id },
    include: { paymentPlan: { include: { schedules: true } } },
  });
  const schedule5 = aminaPurchase?.paymentPlan?.schedules.find((s) => s.installmentNumber === 5);
  if (schedule5 && schedule5.status === "DUE") {
    const existingSubmission = await prisma.paymentSubmission.findFirst({
      where: { paymentScheduleId: schedule5.id, status: "PENDING" },
    });
    if (!existingSubmission) {
      await prisma.paymentSchedule.update({ where: { id: schedule5.id }, data: { status: "AWAITING_VALIDATION" } });
      await prisma.paymentSubmission.create({
        data: {
          paymentScheduleId: schedule5.id,
          userId: demoClient.id,
          reference: "TXN-4821",
          status: "PENDING",
        },
      });
    }
  }

  // 4) Un client avec une échéance réellement en retard aujourd'hui, pour tester le job
  const fatou = await prisma.user.upsert({
    where: { email: "fatou@vanta.app" },
    update: {},
    create: {
      firstName: "Fatou",
      lastName: "Sow",
      email: "fatou@vanta.app",
      passwordHash,
      roleId: clientRole.id,
      verificationStatus: "VERIFIED",
    },
  });
  const existingFatouPurchase = await prisma.purchase.findFirst({
    where: { userId: fatou.id, productId: championAccount.id },
  });
  if (!existingFatouPurchase) {
    const purchase = await prisma.purchase.create({
      data: {
        userId: fatou.id,
        productId: championAccount.id,
        status: "ACTIVE",
        totalPrice: championAccount.priceTotal,
      },
    });
    const remaining = Number(championAccount.priceTotal) - Number(championAccount.initialDepositAmount);
    const plan = await prisma.paymentPlan.create({
      data: {
        purchaseId: purchase.id,
        initialDepositAmount: championAccount.initialDepositAmount,
        initialDepositStatus: "PAID",
        remainingAmount: remaining,
        installmentsCount: 8,
        startDate: new Date("2026-05-20"),
        status: "ACTIVE",
      },
    });
    const monthly = remaining / 8;
    // Échéance 1 due le 20/06/2026 : largement dépassée à la date du jour (31/08/2026),
    // volontairement laissée au statut DUE pour que le job la détecte et calcule la pénalité.
    await prisma.paymentSchedule.create({
      data: {
        paymentPlanId: plan.id,
        installmentNumber: 1,
        dueDate: new Date("2026-06-20"),
        amount: monthly,
        status: "DUE",
      },
    });
    for (let i = 2; i <= 8; i++) {
      await prisma.paymentSchedule.create({
        data: {
          paymentPlanId: plan.id,
          installmentNumber: i,
          dueDate: new Date(new Date("2026-06-20").setMonth(new Date("2026-06-20").getMonth() + (i - 1))),
          amount: monthly,
          status: "UPCOMING",
        },
      });
    }
  }

  console.log("Seed terminé.");
  console.log("Comptes de test (mot de passe: Password123!) :");
  console.log("  Super Admin : admin@vanta.app");
  console.log("  Manager     : manager@vanta.app");
  console.log("  Client démo : amina@vanta.app");
  console.log("  Client en retard (pour tester le job) : fatou@vanta.app");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
