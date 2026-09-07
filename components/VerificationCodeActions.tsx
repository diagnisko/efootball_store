"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

export function VerificationCodeActions({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const confirmDialog = useConfirm();

  async function act(decision: "provide" | "cancel") {
    if (decision === "provide" && !code.trim()) {
      toast.error("Entrez le code reçu avant de valider.");
      return;
    }
    if (decision === "cancel" && !(await confirmDialog("Annuler cette demande sans fournir de code ?"))) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/verification-codes/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, code: decision === "provide" ? code.trim() : undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="bo-row-actions">
        <button className="bo-btn bo-btn-primary bo-btn-sm" onClick={() => setOpen(true)}>Fournir le code</button>
        <button className="bo-btn bo-btn-sm" onClick={() => act("cancel")} disabled={loading}>Annuler</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        autoFocus
        className="bo-input"
        style={{ minWidth: 100 }}
        placeholder="Code reçu"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && act("provide")}
      />
      <button className="bo-btn bo-btn-primary bo-btn-sm" onClick={() => act("provide")} disabled={loading}>
        {loading ? "..." : "Valider"}
      </button>
      <button className="bo-btn bo-btn-sm" onClick={() => setOpen(false)} disabled={loading}>✕</button>
    </div>
  );
}
