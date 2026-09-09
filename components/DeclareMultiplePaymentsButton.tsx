"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProofUploadField } from "@/components/ProofUploadField";

interface ScheduleItem {
  id: string;
  installmentNumber: number;
  amount: number;
  status: string;
}

export function DeclareMultiplePaymentsButton({ schedules }: { schedules: ScheduleItem[] }) {
  const payable = schedules.filter((schedule) => ["DUE", "LATE", "UPCOMING"].includes(schedule.status));
  const [count, setCount] = useState(2);
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [comment, setComment] = useState("");
  const [proofKey, setProofKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const selected = payable.slice(0, Math.max(1, Math.min(count, payable.length)));
  const total = selected.reduce((sum, schedule) => sum + schedule.amount, 0);

  if (payable.length < 2) return null;

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/schedules/group/declare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleIds: selected.map((schedule) => schedule.id), reference, comment, proofUrl: proofKey }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="btn btn-ghost btn-block" onClick={() => setOpen(true)}>
        Payer plusieurs échéances
      </button>
      {open && (
        <div className="modal-bg show" onClick={() => !loading && setOpen(false)}>
          <div className="panel modal" onClick={(event) => event.stopPropagation()}>
            <h3>Déclarer plusieurs paiements</h3>
            <p className="hint">Vous pouvez payer plusieurs mois à la fois ou solder votre plan.</p>
            <label className="settings-label">Nombre de mois</label>
            <select value={count} onChange={(event) => setCount(Number(event.target.value))} disabled={loading}>
              {payable.map((schedule, index) => (
                <option key={schedule.id} value={index + 1}>
                  {index + 1 === payable.length ? "Tout le solde" : `${index + 1} mois`}
                </option>
              ))}
            </select>
            <p className="hint">Montant déclaré : {total.toLocaleString("fr-FR")} FCFA</p>
            <input type="text" placeholder="Référence de transaction (optionnel)" value={reference} onChange={(event) => setReference(event.target.value)} />
            <textarea rows={3} placeholder="Commentaire (optionnel)" value={comment} onChange={(event) => setComment(event.target.value)} />
            <ProofUploadField onUploaded={setProofKey} />
            {error && <p style={{ color: "var(--neon)", fontSize: 12 }}>{error}</p>}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={loading}>Annuler</button>
              <button className="btn btn-primary" onClick={submit} disabled={loading}>
                {loading ? "Envoi..." : "Déclarer le paiement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}