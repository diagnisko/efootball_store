"use client";

import { useState } from "react";
import { uploadFileViaPresignedPost } from "@/lib/uploadFile";

export function ProofUploadField({ onUploaded }: { onUploaded: (key: string | null) => void }) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFileViaPresignedPost("/api/uploads/payment-proof", file);
      setFileName(file.name);
      onUploaded(result.key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload.");
      onUploaded(null);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label className="btn btn-ghost btn-mini" style={{ cursor: uploading ? "wait" : "pointer", display: "inline-flex" }}>
        {uploading ? "Envoi..." : fileName ? `✓ ${fileName}` : "Joindre une preuve (optionnel)"}
        <input type="file" accept="image/*,.pdf" style={{ display: "none" }} disabled={uploading} onChange={handleChange} />
      </label>
      {error && <p style={{ color: "var(--neon)", fontSize: 11, marginTop: 6 }}>{error}</p>}
    </div>
  );
}
