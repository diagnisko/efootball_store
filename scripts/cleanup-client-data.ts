import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const clients = await tx.user.findMany({
      where: { role: { name: "CLIENT" } },
      select: { id: true },
    });
    const clientIds = clients.map((client) => client.id);

    await tx.message.deleteMany();
    await tx.conversation.deleteMany();
    await tx.paymentConfirmation.deleteMany();
    await tx.paymentSubmission.deleteMany();
    await tx.paymentSchedule.deleteMany();
    await tx.paymentPlan.deleteMany();
    await tx.accessInformation.deleteMany();
    await tx.verificationCodeRequest.deleteMany();
    await tx.purchase.deleteMany();
    await tx.productMedia.deleteMany();
    await tx.product.deleteMany();
    await tx.identityDocument.deleteMany();
    await tx.verificationRequest.deleteMany();
    await tx.notification.deleteMany();
    await tx.passwordResetToken.deleteMany();
    await tx.clientNote.deleteMany();
    await tx.managerPermission.deleteMany({ where: { userId: { in: clientIds } } });
    await tx.loginAttempt.deleteMany();
    await tx.adminLog.deleteMany();
    await tx.user.deleteMany({ where: { id: { in: clientIds } } });

    return { clientsDeleted: clientIds.length };
  });

  console.log(`Nettoyage terminé : ${result.clientsDeleted} compte(s) client supprimé(s).`);
}

main()
  .catch((error) => {
    console.error("Nettoyage annulé :", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());