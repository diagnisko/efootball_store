"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export function PaymentActions({ submissionId }: { submissionId: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showNote, setShowNote] = useState<"reject" | "info_requested" | null>(null);
  const [note, setNote] = useState("");
  const router = useRouter();
  const toast = useToast();

  async function act(decision: "confirm" | "reject" | "info_requested") {
    setLoading(decision);
    try {
      const res = await fetch(`/api/admin/payments/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: decision !== "confirm" ? note : undefined }),
      });
      if (!res.ok) throw new Error();
      setShowNote(null);
      router.refresh();
    } catch {
      toast.error("Une erreur est survenue.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button className="bo-btn bo-btn-primary bo-btn-sm" disabled={!!loading} onClick={() => act("confirm")}>
        {loading === "confirm" ? "..." : "Confirmer"}
      </button>
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
