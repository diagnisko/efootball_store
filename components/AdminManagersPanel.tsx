"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

type Manager = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
};

export function AdminManagersPanel({ initialManagers }: { initialManagers: Manager[] }) {
  const router = useRouter();
  const toast = useToast();
  const [managers, setManagers] = useState(initialManagers);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (creating) return;

    setCreating(true);
    try {
      const res = await fetch("/api/admin/managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; manager?: Manager };
      if (!res.ok || !json.manager) throw new Error(json.error || "Impossible de créer le manager.");

      setManagers((current) => [json.manager!, ...current]);
      setForm({ firstName: "", lastName: "", email: "", password: "" });
      toast.success("Compte manager créé.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Supprimer ce compte manager ?");
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/managers/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Suppression impossible.");

      setManagers((current) => current.filter((manager) => manager.id !== id));
      toast.success("Compte manager supprimé.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <form onSubmit={handleCreate} style={{ display: "grid", gap: 12, padding: 20, border: "1px solid var(--bo-border)", borderRadius: 12, background: "var(--bo-panel)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Créer un compte manager</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Prénom</span>
            <input value={form.firstName} onChange={(e) => setForm((current) => ({ ...current, firstName: e.target.value }))} required style={{ padding: 10, borderRadius: 8, border: "1px solid var(--bo-border)", background: "var(--bo-panel-2)" }} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Nom</span>
            <input value={form.lastName} onChange={(e) => setForm((current) => ({ ...current, lastName: e.target.value }))} required style={{ padding: 10, borderRadius: 8, border: "1px solid var(--bo-border)", background: "var(--bo-panel-2)" }} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Email</span>
            <input type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} required style={{ padding: 10, borderRadius: 8, border: "1px solid var(--bo-border)", background: "var(--bo-panel-2)" }} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Mot de passe</span>
            <input type="password" value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} minLength={8} required style={{ padding: 10, borderRadius: 8, border: "1px solid var(--bo-border)", background: "var(--bo-panel-2)" }} />
          </label>
        </div>

        <div>
          <button type="submit" disabled={creating} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "var(--volt)", color: "#10241c", fontWeight: 700, cursor: creating ? "wait" : "pointer" }}>
            {creating ? "Création..." : "Créer le manager"}
          </button>
        </div>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {managers.length === 0 && <div className="bo-panel bo-panel-pad"><div className="bo-empty">Aucun manager pour le moment.</div></div>}

        {managers.map((manager) => (
          <div key={manager.id} className="bo-section">
            <div className="bo-section-head" style={{ alignItems: "center" }}>
              <div>
                <h3 style={{ textTransform: "none", fontSize: 14, color: "var(--bo-text)", fontFamily: "'Manrope'", fontWeight: 700, margin: 0 }}>
                  {manager.firstName} {manager.lastName}
                </h3>
                <span className="mono" style={{ fontSize: 12, color: "var(--bo-muted)" }}>{manager.email}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(manager.id)}
                disabled={deletingId === manager.id}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(220,38,38,0.4)", background: "rgba(220,38,38,0.1)", color: "#f87171", cursor: deletingId === manager.id ? "wait" : "pointer" }}
              >
                {deletingId === manager.id ? "Suppression..." : "Supprimer"}
              </button>
            </div>
            <div style={{ color: "var(--bo-muted)", fontSize: 12, marginTop: 10 }}>
              Créé le {new Date(manager.createdAt).toLocaleDateString("fr-FR")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
