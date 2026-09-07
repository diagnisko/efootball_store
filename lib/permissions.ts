import { prisma } from "./prisma";

export type Capability =
  | "view_clients"
  | "verify_identity"
  | "reject_identity"
  | "view_id_documents"
  | "confirm_payment"
  | "reject_payment"
  | "manage_offers"
  | "delete_offers"
  | "suspend_client"
  | "delete_client"
  | "cancel_contract"
  | "manage_managers"
  | "manage_platform_settings"
  | "send_access_info"
  | "reply_messages"
  | "view_statistics";

/**
 * Vérifie côté serveur si un utilisateur peut exécuter une action donnée.
 * SUPER_ADMIN a toujours toutes les capacités. MANAGER dépend de la table
 * ManagerPermission (configurable par le Super Admin). CLIENT n'a aucune capacité admin.
 * Cette fonction doit être appelée dans CHAQUE route sensible — jamais uniquement
 * masquer un bouton côté frontend.
 */
export async function hasCapability(
  userId: string,
  capability: Capability
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user) return false;
  if (user.role.name === "SUPER_ADMIN") return true;
  if (user.role.name !== "MANAGER") return false;

  const permission = await prisma.managerPermission.findUnique({
    where: { userId_capability: { userId, capability } },
  });
  return permission?.granted ?? false;
}

export async function requireCapability(
  userId: string,
  capability: Capability
): Promise<void> {
  const allowed = await hasCapability(userId, capability);
  if (!allowed) {
    const err = new Error(`Forbidden: missing capability "${capability}"`);
    // @ts-expect-error attach status for API route handlers
    err.status = 403;
    throw err;
  }
}
