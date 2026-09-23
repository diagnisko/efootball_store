"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

export function DeleteProductButton({ productId, title }: { productId: string; title: string }) {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordPrompt, setPasswordPrompt] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const confirmDialog = useConfirm();

  async function handleDelete() {
    if (!(await confirmDialog(`Supprimer définitivement "${title}" ? Cette action est irréversible.`))) return;
    setPassword("");
    setPasswordPrompt(true);
  }

  async function confirmDelete() {
    if (!password) {
      toast.error("Saisissez le mot de passe administrateur.");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Une erreur est survenue.");
      return;
    }
    setPasswordPrompt(false);
    router.refresh();
  }

  return (
    <>
      <button className="bo-btn bo-btn-sm" onClick={handleDelete} disabled={loading}>
        {loading ? "..." : "Supprimer"}
      </button>
      {passwordPrompt && (
        <div className="bo-modal-overlay" onClick={() => !loading && setPasswordPrompt(false)}>
          <div className="bo-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <p style={{ fontSize: 14, color: "var(--bo-text)", marginBottom: 12 }}>
              Entrez votre mot de passe administrateur pour confirmer la suppression.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe administrateur"
              autoFocus
              disabled={loading}
              style={{ width: "100%", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="bo-btn" onClick={() => setPasswordPrompt(false)} disabled={loading}>Annuler</button>
              <button className="bo-btn bo-btn-danger" onClick={confirmDelete} disabled={loading}>
                {loading ? "..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
