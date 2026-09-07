"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

export function ClientStatusActions({ clientId, accountStatus }: { clientId: string; accountStatus: string }) {
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState("");
  const router = useRouter();
  const toast = useToast();
  const confirmDialog = useConfirm();

  async function act(action: "suspend" | "reactivate") {
    const confirmMsg =
      action === "suspend"
        ? "Suspendre ce client ? Il ne pourra plus se connecter tant qu'il n'est pas réactivé."
        : "Réactiver ce client ?";
    if (!(await confirmDialog(confirmMsg))) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/suspend`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteClient() {
    if (!password) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.push("/admin/clients");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {accountStatus === "SUSPENDED" ? (
        <button className="bo-btn bo-btn-primary bo-btn-sm" disabled={loading} onClick={() => act("reactivate")}>
          {loading ? "..." : "Réactiver"}
        </button>
      ) : (
        <button className="bo-btn bo-btn-sm" disabled={loading} onClick={() => act("suspend")}>
          {loading ? "..." : "Suspendre"}
        </button>
      )}
      <button className="bo-btn bo-btn-danger bo-btn-sm" disabled={loading} onClick={() => setDeleteOpen(true)}>
        Supprimer
      </button>
      {deleteOpen && (
        <div className="bo-modal-overlay" onClick={() => setDeleteOpen(false)}>
          <div className="bo-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <h3 style={{ marginBottom: 10 }}>Supprimer définitivement ce client ?</h3>
            <p style={{ color: "var(--bo-muted)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
              Cette action supprime le compte et son historique. Saisissez votre mot de passe administrateur pour confirmer.
            </p>
            <input
              className="bo-input"
              type="password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button className="bo-btn" onClick={() => { setDeleteOpen(false); setPassword(""); }} disabled={loading}>Annuler</button>
              <button className="bo-btn bo-btn-danger" onClick={deleteClient} disabled={loading || !password}>
                {loading ? "Suppression..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
