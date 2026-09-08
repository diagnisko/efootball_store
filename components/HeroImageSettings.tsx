"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HeroImageSettings({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function save(nextUrl = url) {
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/admin/settings/hero-image", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: nextUrl }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error || "Impossible d'enregistrer l'image.");
      return;
    }
    setUrl(result.url ?? "");
    setMessage("Image de couverture mise à jour.");
    router.refresh();
  }

  async function upload(file: File) {
    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/uploads/product-media", { method: "POST", body: formData });
    const result = await response.json().catch(() => ({}));
    setUploading(false);
    if (!response.ok || !result.publicUrl) {
      setMessage(result.error || "Impossible d'envoyer cette image.");
      return;
    }
    setUrl(result.publicUrl);
    await save(result.publicUrl);
  }

  return (
    <div className="hero-settings-grid">
      <div>
        <label className="settings-label" htmlFor="hero-image-url">URL de l&apos;image</label>
        <input
          id="hero-image-url"
          className="bo-input hero-settings-url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://..."
        />
        <p className="settings-hint">Cette image est indépendante des offres et s&apos;affiche dans le hero de l&apos;accueil.</p>
        <div className="hero-settings-actions">
          <label className="bo-btn bo-btn-sm">
            {uploading ? "Envoi..." : "Téléverser une image"}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={uploading || saving}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }}
            />
          </label>
          <button type="button" className="bo-btn bo-btn-primary bo-btn-sm" disabled={saving || uploading} onClick={() => void save()}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          <button type="button" className="bo-btn bo-btn-sm" disabled={saving || uploading || !url} onClick={() => void save("")}>Retirer l&apos;image</button>
        </div>
        {message && <p className="settings-hint">{message}</p>}
      </div>
      <div className="hero-settings-preview">
        {url ? <img src={url} alt="Aperçu de la couverture d'accueil" /> : <span>Fond VANTA par défaut</span>}
      </div>
    </div>
  );
}
