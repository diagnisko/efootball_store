import { prisma } from "@/lib/prisma";

export async function getAdminNotificationRecipients(): Promise<string[]> {
  const configured = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (configured.length > 0) return [...new Set(configured)];

  const admins = await prisma.user.findMany({
    where: { role: { name: "SUPER_ADMIN" }, accountStatus: "ACTIVE" },
    select: { email: true },
  });

  return [...new Set(admins.map((admin) => admin.email.trim().toLowerCase()).filter(Boolean))];
}