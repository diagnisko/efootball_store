"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export function PaymentActions({ submissionId, isDeposit }: { submissionId: string; isDeposit: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showNote, setShowNote] = useState<"reject" | "info_requested" | null>(null);
  const [note, setNote] = useState("");
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const router = useRouter();
  const toast = useToast();

  async function act(decision: "confirm" | "reject" | "info_requested") {
    if (decision === "confirm" && isDeposit && (!accountEmail.trim() || !accountPassword.trim())) {
      toast.error("Renseignez l'e-mail et le mot de passe du compte.");
      return;
    }
    setLoading(decision);
    try {
      const res = await fetch(`/api/admin/payments/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          note: decision !== "confirm" ? note : undefined,
          accountEmail: decision === "confirm" && isDeposit ? accountEmail.trim() : undefined,
          accountPassword: decision === "confirm" && isDeposit ? accountPassword : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setShowNote(null);
      setShowAccessForm(false);
      setAccountEmail("");
      setAccountPassword("");
      router.refresh();
    } catch {
      toast.error("Une erreur est survenue.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {!isDeposit && (
        <button className="bo-btn bo-btn-primary bo-btn-sm" disabled={!!loading} onClick={() => act("confirm")}>
          {loading === "confirm" ? "..." : "Confirmer"}
        </button>
      )}
      {isDeposit && !showAccessForm && (
        <>
          <button className="bo-btn bo-btn-primary bo-btn-sm" disabled={!!loading} onClick={() => setShowAccessForm(true)}>
            Confirmer et fournir le compte
          </button>
        </>
      )}
      {isDeposit && showAccessForm && (
        <div className="bo-access-form">
          <input
            type="email"
            placeholder="E-mail du compte"
            value={accountEmail}
            onChange={(e) => setAccountEmail(e.target.value)}
          />
          <input
            type="text"
            placeholder="Mot de passe du compte"
            value={accountPassword}
            onChange={(e) => setAccountPassword(e.target.value)}
          />
          <button className="bo-btn bo-btn-primary bo-btn-sm" disabled={!!loading} onClick={() => act("confirm")}>
            {loading === "confirm" ? "..." : "Valider et publier"}
          </button>
          <button className="bo-btn bo-btn-sm" disabled={!!loading} onClick={() => setShowAccessForm(false)}>
            Annuler
          </button>
        </div>
      )}
      {!showNote ? (
        <>
          <button className="bo-btn bo-btn-sm" disabled={!!loading} onClick={() => setShowNote("reject")}>
            Refuser
          </button>
          <button className="bo-btn bo-btn-sm" disabled={!!loading} onClick={() => setShowNote("info_requested")}>
            Demander infos
          </button>
        </>
      ) : (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="text"
            placeholder={showNote === "reject" ? "Motif du refus" : "Précisions demandées"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{
              background: "rgba(255,255,255,.04)",
              border: "1px solid var(--bo-border)",
              color: "var(--bo-text)",
              padding: "8px 10px",
              fontSize: 12,
              width: 180,
            }}
          />
          <button className="bo-btn bo-btn-sm" disabled={!!loading} onClick={() => act(showNote)}>
            {loading ? "..." : "Envoyer"}
          </button>
        </div>
      )}
    </div>
  );
}
