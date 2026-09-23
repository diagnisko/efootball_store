"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export function CancelContractButton({ purchaseId }: { purchaseId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function cancel() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/purchases/${purchaseId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined, password }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Impossible d'annuler le contrat.");
      setOpen(false);
      setPassword("");
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="bo-btn bo-btn-danger bo-btn-sm" onClick={() => setOpen(true)} disabled={loading}>
        Annuler le contrat
      </button>
      {open && (
        <div className="bo-modal-overlay" onClick={() => !loading && setOpen(false)}>
          <div className="bo-modal cancel-contract-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <h3>Annuler ce contrat ?</h3>
            <p className="cancel-contract-modal-copy">
              Cette action rendra le produit disponible et annulera le plan de paiement.
            </p>
            <textarea
              rows={3}
              placeholder="Motif de l'annulation (optionnel)"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={loading}
              className="cancel-contract-field"
            />
            <input
              type="password"
              placeholder="Votre mot de passe admin"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              autoComplete="current-password"
              className="cancel-contract-field"
            />
            <div className="cancel-contract-actions">
              <button className="bo-btn" onClick={() => setOpen(false)} disabled={loading}>Retour</button>
              <button className="bo-btn bo-btn-danger" onClick={cancel} disabled={loading}>
                {loading ? "Annulation..." : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}