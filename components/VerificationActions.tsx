"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export function VerificationActions({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();
  const toast = useToast();

  async function act(decision: "approve" | "reject") {
    setLoading(decision);
    try {
      const res = await fetch(`/api/admin/verifications/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, rejectionReason: decision === "reject" ? reason : undefined }),
      });
      if (!res.ok) throw new Error();
      setShowReject(false);
      router.refresh();
    } catch {
      toast.error("Une erreur est survenue.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button className="bo-btn bo-btn-primary bo-btn-sm" disabled={!!loading} onClick={() => act("approve")}>
        {loading === "approve" ? "..." : "Valider"}
      </button>
      {!showReject ? (
        <button className="bo-btn bo-btn-sm" disabled={!!loading} onClick={() => setShowReject(true)}>
          Refuser
        </button>
      ) : (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Motif du refus"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              background: "rgba(255,255,255,.04)",
              border: "1px solid var(--bo-border)",
              color: "var(--bo-text)",
              padding: "8px 10px",
              fontSize: 12,
              width: 160,
            }}
          />
          <button className="bo-btn bo-btn-sm" disabled={!!loading} onClick={() => act("reject")}>
            {loading === "reject" ? "..." : "Confirmer"}
          </button>
        </div>
      )}
    </div>
  );
}
