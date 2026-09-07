"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFileViaPresignedPost } from "@/lib/uploadFile";
import { useToast } from "@/components/Toast";

interface MediaRow {
  mediaType: "IMAGE" | "VIDEO" | "THUMBNAIL";
  url: string;
  isMain: boolean;
}

interface InitialData {
  id?: string;
  title: string;
  description: string;
  priceTotal: number;
  initialDepositAmount: number;
  installmentsCount: number;
  status: "AVAILABLE" | "IN_PROGRESS" | "SOLD" | "HIDDEN";
  featured: boolean;
  importantInfo: string;
  ovr?: number;
  platform: string;
  coins?: number;
  division?: number;
  media: MediaRow[];
}

const EMPTY: InitialData = {
  title: "",
  description: "",
  priceTotal: 0,
  initialDepositAmount: 0,
  installmentsCount: 8,
  status: "AVAILABLE",
  featured: false,
  importantInfo: "",
  platform: "Mobile",
  media: [],
};

export function ProductForm({ initial }: { initial?: InitialData }) {
  const [data, setData] = useState<InitialData>(initial ?? EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!initial?.id;

  async function handleFileUpload(i: number, file: File) {
    setUploadingIndex(i);
    try {
      const result = await uploadFileViaPresignedPost("/api/uploads/product-media", file);
      updateMedia(i, {
        url: result.publicUrl ?? "",
        mediaType: result.mediaType ?? "IMAGE",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'upload.");
    } finally {
      setUploadingIndex(null);
    }
  }

  function update<K extends keyof InitialData>(key: K, value: InitialData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function addMedia() {
    update("media", [...data.media, { mediaType: "IMAGE", url: "", isMain: data.media.length === 0 }]);
  }
  function updateMedia(i: number, patch: Partial<MediaRow>) {
    const next = [...data.media];
    next[i] = { ...next[i], ...patch };
    update("media", next);
  }
  function removeMedia(i: number) {
    update("media", data.media.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      title: data.title,
      description: data.description,
      priceTotal: Number(data.priceTotal),
      initialDepositAmount: Number(data.initialDepositAmount),
      installmentsCount: Number(data.installmentsCount),
      status: data.status,
      featured: data.featured,
      importantInfo: data.importantInfo || undefined,
      features: {
        platform: data.platform,
        ovr: data.ovr ? Number(data.ovr) : undefined,
        coins: data.coins ? Number(data.coins) : undefined,
        division: data.division ? Number(data.division) : undefined,
      },
      media: data.media.filter((m) => m.url.trim().length > 0),
    };

    const res = await fetch(isEdit ? `/api/admin/products/${initial!.id}` : "/api/admin/products", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Une erreur est survenue.");
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--bo-panel-2)",
    border: "1px solid var(--bo-border)", color: "var(--bo-text)",
    padding: 12, fontSize: 14, fontFamily: "Manrope", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: "var(--bo-muted-2)", letterSpacing: ".06em",
    textTransform: "uppercase", display: "block", marginBottom: 8,
  };

  return (
    <form onSubmit={handleSubmit} className="bo-panel bo-panel-pad" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label style={labelStyle}>Titre</label>
        <input style={inputStyle} required value={data.title} onChange={(e) => update("title", e.target.value)} />
      </div>

      <div>
        <label style={labelStyle}>Description</label>
        <textarea
          style={{ ...inputStyle, resize: "vertical" }}
          rows={3}
          required
          value={data.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="grid-2">
        <div>
          <label style={labelStyle}>Prix total (FCFA)</label>
          <input type="number" min={0} style={inputStyle} required value={data.priceTotal || ""} onChange={(e) => update("priceTotal", Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Apport initial (FCFA)</label>
          <input type="number" min={0} style={inputStyle} required value={data.initialDepositAmount || ""} onChange={(e) => update("initialDepositAmount", Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Nombre de mensualités</label>
          <input type="number" min={1} max={24} style={inputStyle} value={data.installmentsCount} onChange={(e) => update("installmentsCount", Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Statut</label>
          <select style={inputStyle} value={data.status} onChange={(e) => update("status", e.target.value as InitialData["status"])}>
            <option value="AVAILABLE">Disponible</option>
            <option value="IN_PROGRESS">En cours de paiement</option>
            <option value="SOLD">Vendu</option>
            <option value="HIDDEN">Masqué</option>
          </select>
        </div>
      </div>

      <div className="grid-4">
        <div>
          <label style={labelStyle}>Plateforme</label>
          <input style={inputStyle} value={data.platform} onChange={(e) => update("platform", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>OVR</label>
          <input type="number" style={inputStyle} value={data.ovr ?? ""} onChange={(e) => update("ovr", Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Coins</label>
          <input type="number" style={inputStyle} value={data.coins ?? ""} onChange={(e) => update("coins", Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Division</label>
          <input type="number" style={inputStyle} value={data.division ?? ""} onChange={(e) => update("division", Number(e.target.value))} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Informations importantes (optionnel)</label>
        <textarea style={{ ...inputStyle, resize: "vertical" }} rows={2} value={data.importantInfo} onChange={(e) => update("importantInfo", e.target.value)} />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer" }}>
        <input type="checkbox" checked={data.featured} onChange={(e) => update("featured", e.target.checked)} />
        Mettre en avant sur la page d&apos;accueil
      </label>

      <div>
        <label style={labelStyle}>Médias</label>
        <p style={{ fontSize: 11, color: "var(--bo-muted-2)", marginBottom: 10 }}>
          Vous pouvez ajouter plusieurs médias de types différents pour la même offre : cliquez sur
          « + Ajouter un média » une fois par fichier (une image, puis une nouvelle ligne pour une vidéo,
          etc.), et téléversez ou collez une URL pour chacun. Cochez « Principale » sur le média à
          afficher en priorité dans la galerie.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.media.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                style={{ ...inputStyle, width: 110 }}
                value={m.mediaType}
                onChange={(e) => updateMedia(i, { mediaType: e.target.value as MediaRow["mediaType"] })}
              >
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Vidéo</option>
                <option value="THUMBNAIL">Miniature</option>
              </select>
              <input
                style={inputStyle}
                placeholder="https://... (ou téléversez un fichier →)"
                value={m.url}
                onChange={(e) => updateMedia(i, { url: e.target.value })}
              />
              <label className="bo-btn bo-btn-sm" style={{ whiteSpace: "nowrap", cursor: uploadingIndex === i ? "wait" : "pointer" }}>
                {uploadingIndex === i ? "Envoi..." : "Téléverser"}
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                  style={{ display: "none" }}
                  disabled={uploadingIndex !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(i, file);
                    e.target.value = "";
                  }}
                />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--bo-muted-2)", whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={m.isMain} onChange={(e) => updateMedia(i, { isMain: e.target.checked })} />
                Principale
              </label>
              <button type="button" className="bo-btn bo-btn-sm" onClick={() => removeMedia(i)}>Retirer</button>
            </div>
          ))}
        </div>
        <button type="button" className="bo-btn bo-btn-sm" style={{ marginTop: 10 }} onClick={addMedia}>
          + Ajouter un média
        </button>
      </div>

      {error && <p style={{ color: "var(--neon)", fontSize: 13 }}>{error}</p>}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" className="bo-btn bo-btn-primary" disabled={loading}>
          {loading ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Créer l'offre"}
        </button>
        <button type="button" className="bo-btn" onClick={() => router.push("/admin/products")}>
          Annuler
        </button>
      </div>
    </form>
  );
}
