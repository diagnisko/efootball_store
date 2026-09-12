"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { ManagerPermissionsGrid } from "@/components/ManagerPermissionsGrid";

type Manager = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  granted: Record<string, boolean>;
};

export function AdminManagersPanel({ initialManagers }: { initialManagers: Manager[] }) {
  const router = useRouter();
  const toast = useToast();
  const [managers, setManagers] = useState(initialManagers);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openPermissionsId, setOpenPermissionsId] = useState<string | null>(null);

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

      setManagers((current) => [{ ...json.manager!, granted: {} }, ...current]);
      setForm({ firstName: "", lastName: "", email: "", password: "" });
      setShowCreate(false);
      toast.success("Compte manager créé.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    const password = window.prompt("Pour confirmer la suppression, entrez votre mot de passe admin :");
    if (!password) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/managers/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
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
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="bo-btn bo-btn-primary" onClick={() => setShowCreate((current) => !current)}>
          {showCreate ? "Fermer" : "+ Ajouter un manager"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bo-panel bo-panel-pad" style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 14, letterSpacing: ".06em", textTransform: "uppercase" }}>Créer un manager</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="settings-label">Prénom</span>
              <input className="settings-input" value={form.firstName} onChange={(e) => setForm((current) => ({ ...current, firstName: e.target.value }))} required />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="settings-label">Nom</span>
              <input className="settings-input" value={form.lastName} onChange={(e) => setForm((current) => ({ ...current, lastName: e.target.value }))} required />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="settings-label">Email</span>
              <input type="email" className="settings-input" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} required />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="settings-label">Mot de passe</span>
              <input type="password" className="settings-input" value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} minLength={8} required />
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={creating} className="bo-btn bo-btn-primary">
              {creating ? "Création..." : "Ajouter le manager"}
            </button>
          </div>
        </form>
      )}

      <div className="manager-list-grid">
        {managers.length === 0 && <div className="bo-panel bo-panel-pad"><div className="bo-empty">Aucun manager pour le moment.</div></div>}

        {managers.map((manager) => (
          <div key={manager.id} className="manager-card" style={{ display: "grid", gap: 14 }}>
            <div className="manager-card-head">
              <div>
                <div className="manager-avatar">{manager.firstName[0]}{manager.lastName[0]}</div>
                <div style={{ marginTop: 10 }}>
                  <h3 style={{ textTransform: "none", fontSize: 15, color: "var(--bo-text)", fontFamily: "'Manrope'", fontWeight: 700, margin: 0 }}>
                    {manager.firstName} {manager.lastName}
                  </h3>
                  <span className="mono" style={{ display: "block", marginTop: 4, fontSize: 12, color: "var(--bo-muted)" }}>{manager.email}</span>
                </div>
              </div>

              <div className="manager-card-actions">
                <button
                  type="button"
                  className="bo-btn bo-btn-sm"
                  onClick={() => {
                    setOpenPermissionsId((current) => current === manager.id ? null : manager.id);
                  }}
                >
                  {openPermissionsId === manager.id ? "Fermer" : "Gérer"}
                </button>
                <button
                  type="button"
                  className="bo-btn bo-btn-sm bo-btn-danger"
                  onClick={() => void handleDelete(manager.id)}
                  disabled={deletingId === manager.id}
                >
                  {deletingId === manager.id ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>

            <div className="manager-card-meta">
              <span>Compte manager</span>
              <strong>{new Date(manager.createdAt).toLocaleDateString("fr-FR")}</strong>
            </div>

            {openPermissionsId === manager.id && (
              <div className="manager-card-permissions">
                <div className="manager-card-permissions-head">
                  <div>
                    <h3>Permissions</h3>
                    <span className="mono">{manager.email}</span>
                  </div>
                  <span className="manager-permissions-hint">Modifications enregistrées automatiquement</span>
                </div>
                <ManagerPermissionsGrid managerId={manager.id} granted={manager.granted} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
