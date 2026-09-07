import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export async function logAdminAction(params: {
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
}) {
  await prisma.adminLog.create({
    data: {
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      oldValue: params.oldValue ?? undefined,
      newValue: params.newValue ?? undefined,
    },
  });
}
