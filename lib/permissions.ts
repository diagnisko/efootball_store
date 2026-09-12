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

export const CAPABILITY_LABELS: Record<Capability, string> = {
  view_clients: "Voir les clients",
  verify_identity: "Valider une identité",
  reject_identity: "Refuser une identité",
  view_id_documents: "Voir les documents d'identité",
  confirm_payment: "Confirmer un paiement",
  reject_payment: "Refuser un paiement",
  manage_offers: "Gérer les offres",
  delete_offers: "Supprimer une offre",
  suspend_client: "Suspendre un client",
  delete_client: "Supprimer un client",
  cancel_contract: "Annuler un contrat",
  manage_managers: "Gérer les managers",
  manage_platform_settings: "Modifier les paramètres",
  send_access_info: "Transmettre les infos d'accès",
  reply_messages: "Répondre aux messages",
  view_statistics: "Voir les statistiques",
};

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

export async function getManagerCapabilities(userId: string): Promise<Record<Capability, boolean>> {
  const defaultMap: Record<Capability, boolean> = {
    view_clients: false,
    verify_identity: false,
    reject_identity: false,
    view_id_documents: false,
    confirm_payment: false,
    reject_payment: false,
    manage_offers: false,
    delete_offers: false,
    suspend_client: false,
    delete_client: false,
    cancel_contract: false,
    manage_managers: false,
    manage_platform_settings: false,
    send_access_info: false,
    reply_messages: false,
    view_statistics: false,
  };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || user.role.name !== "MANAGER") return defaultMap;

  const permissions = await prisma.managerPermission.findMany({
    where: { userId },
    select: { capability: true, granted: true },
  });

  for (const permission of permissions) {
    if (permission.capability in defaultMap) {
      defaultMap[permission.capability as Capability] = permission.granted;
    }
  }

  return defaultMap;
}

export async function hasAnyCapability(userId: string, capabilities: Capability[]): Promise<boolean> {
  if (!capabilities.length) return false;
  const values = await Promise.all(capabilities.map((capability) => hasCapability(userId, capability)));
  return values.some(Boolean);
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
