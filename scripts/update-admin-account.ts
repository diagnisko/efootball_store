import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const email = (process.env.ADMIN_EMAIL ?? "Misterdou.com@gmail.com").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "Misterdou2026";

async function main() {
  const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
  if (!superAdminRole) {
    throw new Error("SUPER_ADMIN role missing");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  const oldAdmin = await prisma.user.findUnique({ where: { email: "admin@vanta.app" } });

  if (existingByEmail) {
    await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        passwordHash,
        roleId: superAdminRole.id,
        verificationStatus: "VERIFIED",
      },
    });
    console.log(`UPDATED_EXISTING ${email}`);
  } else if (oldAdmin) {
    await prisma.user.update({
      where: { id: oldAdmin.id },
      data: {
        email,
        passwordHash,
        roleId: superAdminRole.id,
        verificationStatus: "VERIFIED",
      },
    });
    console.log(`RENAMED_OLD_ADMIN ${email}`);
  } else {
    await prisma.user.create({
      data: {
        firstName: "Admin",
        lastName: "VANTA",
        email,
        passwordHash,
        roleId: superAdminRole.id,
        verificationStatus: "VERIFIED",
      },
    });
    console.log(`CREATED_NEW_ADMIN ${email}`);
  }

  const saved = await prisma.user.findUnique({ where: { email } });
  console.log("FINAL_USER", {
    email: saved?.email,
    roleId: saved?.roleId,
    verificationStatus: saved?.verificationStatus,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
