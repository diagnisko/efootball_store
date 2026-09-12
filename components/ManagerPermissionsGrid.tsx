"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import type { Capability } from "@/lib/permissions";

const LABELS: Record<Capability, string> = {
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

const EDITABLE: Capability[] = [
  "view_clients",
  "verify_identity",
  "reject_identity",
  "view_id_documents",
  "confirm_payment",
  "reject_payment",
  "manage_offers",
  "delete_offers",
  "suspend_client",
  "delete_client",
  "cancel_contract",
  "manage_platform_settings",
  "send_access_info",
  "reply_messages",
  "view_statistics",
];

export function ManagerPermissionsGrid({
  managerId,
  granted,
}: {
  managerId: string;
  granted: Record<string, boolean>;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function toggle(capability: Capability, next: boolean) {
    setPending(capability);
    try {
      const res = await fetch(`/api/admin/managers/${managerId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capability, granted: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Une erreur est survenue.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="manager-permissions-grid">
      {EDITABLE.map((cap) => (
        <label
          key={cap}
          className={`manager-permission-item ${pending === cap ? "is-pending" : ""}`}
        >
          <input
            type="checkbox"
            checked={!!granted[cap]}
            disabled={pending === cap}
            onChange={(e) => toggle(cap, e.target.checked)}
          />
          <span>{LABELS[cap]}</span>
        </label>
      ))}
    </div>
  );
}
