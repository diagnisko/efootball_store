"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Note {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
}

export function ClientNotesPanel({ clientId, notes }: { clientId: string; notes: Note[] }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setContent("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bo-panel bo-panel-pad">
      <h3>Notes internes</h3>
      <p style={{ fontSize: 11, color: "var(--bo-muted-2)", marginBottom: 14 }}>
        Visibles uniquement par l&apos;équipe VANTA — jamais par le client.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {notes.length === 0 && <p style={{ fontSize: 13, color: "var(--bo-muted)" }}>Aucune note pour l&apos;instant.</p>}
        {notes.map((n) => (
          <div key={n.id} style={{ padding: 12, background: "rgba(255,255,255,.03)", borderRadius: 6 }}>
            <p style={{ fontSize: 13, whiteSpace: "pre-wrap", marginBottom: 6 }}>{n.content}</p>
            <span style={{ fontSize: 11, color: "var(--bo-muted-2)" }}>
              {n.authorName} ·{" "}
              {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(n.createdAt))}
            </span>
          </div>
        ))}
      </div>

      <textarea
        rows={2}
        placeholder="Ajouter une note (ex: a contacté le support pour...)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{
          width: "100%", background: "rgba(255,255,255,.03)", border: "1px solid var(--bo-border)",
          color: "var(--bo-text)", padding: 10, fontSize: 13, fontFamily: "Manrope", resize: "none", outline: "none", marginBottom: 10,
        }}
      />
      {error && <p style={{ color: "var(--neon)", fontSize: 12, marginBottom: 10 }}>{error}</p>}
      <button className="bo-btn bo-btn-sm" onClick={submit} disabled={loading || !content.trim()}>
        {loading ? "..." : "Ajouter la note"}
      </button>
    </div>
  );
}
