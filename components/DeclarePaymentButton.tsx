"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProofUploadField } from "@/components/ProofUploadField";

export function DeclarePaymentButton({
  scheduleId,
  amount,
  mini = false,
}: {
  scheduleId: string;
  amount: number;
  mini?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [comment, setComment] = useState("");
  const [proofKey, setProofKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/schedules/${scheduleId}/declare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, comment, proofUrl: proofKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Une erreur est survenue.");
      }
      setOpen(false);
      router.refresh(); // recharge les données réelles du dashboard depuis le serveur
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className={`btn btn-primary ${mini ? "btn-mini" : ""}`}
        onClick={() => setOpen(true)}
      >
        {mini ? "Déclarer" : "Déclarer un paiement"}
      </button>

      {open && (
        <div className="modal-bg show" onClick={() => !loading && setOpen(false)}>
          <div className="panel modal" onClick={(e) => e.stopPropagation()}>
            <h3>Déclarer votre paiement</h3>
            <p className="hint">
              {amount.toLocaleString("fr-FR")} FCFA. Ajoutez une référence si disponible.
            </p>
            <input
              type="text"
              placeholder="Référence de transaction (optionnel)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,.03)",
                border: "1px solid var(--glass-border-soft)",
                color: "var(--ivory)",
                padding: 12,
                marginBottom: 14,
                outline: "none",
              }}
            />
            <textarea
              rows={3}
              placeholder="Commentaire (optionnel)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <ProofUploadField onUploaded={setProofKey} />
            {error && <p style={{ color: "var(--neon)", fontSize: 12, marginBottom: 10 }}>{error}</p>}
            <div className="modal-actions">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setOpen(false)} disabled={loading}>
                Annuler
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={loading}>
                {loading ? "Envoi..." : "Confirmer l'envoi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
