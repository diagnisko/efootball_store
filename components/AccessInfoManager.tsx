"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

interface AccessInfoItem {
  id: string;
  title: string;
  content: string;
  visibleToClient: boolean;
  createdAt: string;
  releasedAt: string | null;
}

export function AccessInfoManager({ purchaseId, items }: { purchaseId: string; items: AccessInfoItem[] }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const router = useRouter();
  const toast = useToast();
  const confirmDialog = useConfirm();

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--bo-panel-2)",
    border: "1px solid var(--bo-border)", color: "var(--bo-text)",
    padding: 12, fontSize: 14, fontFamily: "Manrope", outline: "none",
  };

  async function create() {
    setLoading("create");
    try {
      const res = await fetch("/api/admin/access-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId, title, content }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setTitle(""); setContent(""); setShowForm(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(null);
    }
  }

  async function toggleVisible(id: string, next: boolean) {
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/access-info/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleToClient: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(null);
    }
  }

  async function saveEdit(id: string) {
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/access-info/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditingId(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(null);
    }
  }

  async function remove(id: string, itemTitle: string) {
    if (!(await confirmDialog(`Supprimer "${itemTitle}" ?`))) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/access-info/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
        {items.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--bo-muted)" }}>Aucune information d&apos;accès pour cet achat.</p>
        )}
        {items.map((it) => (
          <div key={it.id} className="bo-panel bo-panel-pad" style={{ padding: 18 }}>
            {editingId === it.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input style={inputStyle} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                <textarea style={{ ...inputStyle, resize: "vertical" }} rows={4} value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="bo-btn bo-btn-primary bo-btn-sm" disabled={loading === it.id} onClick={() => saveEdit(it.id)}>
                    {loading === it.id ? "..." : "Enregistrer"}
                  </button>
                  <button className="bo-btn bo-btn-sm" onClick={() => setEditingId(null)}>Annuler</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <h4 style={{ fontSize: 15 }}>{it.title}</h4>
                  <span className={`badge ${it.visibleToClient ? "badge-ok" : "badge-muted"}`}>
                    {it.visibleToClient ? "Visible par le client" : "Non publiée"}
                  </span>
                </div>
                <pre style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: "var(--bo-muted)", whiteSpace: "pre-wrap", marginBottom: 14 }}>
                  {it.content}
                </pre>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="bo-btn bo-btn-primary bo-btn-sm"
                    disabled={loading === it.id}
                    onClick={() => toggleVisible(it.id, !it.visibleToClient)}
                  >
                    {loading === it.id ? "..." : it.visibleToClient ? "Retirer la visibilité" : "Rendre visible au client"}
                  </button>
                  <button
                    className="bo-btn bo-btn-sm"
                    onClick={() => { setEditingId(it.id); setEditTitle(it.title); setEditContent(it.content); }}
                  >
                    Modifier
                  </button>
                  <button className="bo-btn bo-btn-sm" onClick={() => remove(it.id, it.title)} disabled={loading === it.id}>
                    Supprimer
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {!showForm ? (
        <button className="bo-btn" onClick={() => setShowForm(true)}>+ Ajouter une information d&apos;accès</button>
      ) : (
        <div className="bo-panel bo-panel-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input style={inputStyle} placeholder="Titre (ex: Identifiants du compte)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea style={{ ...inputStyle, resize: "vertical" }} rows={4} placeholder="Contenu (identifiants, instructions...)" value={content} onChange={(e) => setContent(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="bo-btn bo-btn-primary bo-btn-sm" disabled={loading === "create" || !title || !content} onClick={create}>
              {loading === "create" ? "..." : "Ajouter"}
            </button>
            <button className="bo-btn bo-btn-sm" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
