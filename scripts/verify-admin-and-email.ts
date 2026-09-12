import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { sendEmail } from "../lib/email";

const prisma = new PrismaClient();
const email = (process.env.ADMIN_EMAIL ?? "Misterdou.com@gmail.com").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "Misterdou2026";

async function main() {
  const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
  if (!superAdminRole) throw new Error("SUPER_ADMIN role missing");

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { email: "misterdou@vanta.app" }, { email: "admin@vanta.app" }] },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        email,
        passwordHash,
        roleId: superAdminRole.id,
        verificationStatus: "VERIFIED",
      },
    });
    console.log("UPDATED_ADMIN", email);
  } else {
    const created = await prisma.user.create({
      data: {
        firstName: "Admin",
        lastName: "VANTA",
        email,
        passwordHash,
        roleId: superAdminRole.id,
        verificationStatus: "VERIFIED",
      },
    });
    console.log("CREATED_ADMIN", created.email);
  }

  const saved = await prisma.user.findUnique({ where: { email } });
  console.log("FINAL_ADMIN", {
    email: saved?.email,
    verificationStatus: saved?.verificationStatus,
    roleId: saved?.roleId,
  });

  const emailResult = await sendEmail({
    to: email,
    subject: "Test email VANTA",
    html: "<p>Test email VANTA OK.</p>",
  });

  console.log("EMAIL_RESULT", emailResult);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
