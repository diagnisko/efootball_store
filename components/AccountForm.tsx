"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFileViaPresignedPost } from "@/lib/uploadFile";
import { useToast } from "@/components/Toast";

interface Props {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  avatarUrl: string | null;
  hasPassword: boolean;
}

export function AccountForm(props: Props) {
  const [firstName, setFirstName] = useState(props.firstName);
  const [lastName, setLastName] = useState(props.lastName);
  const [phone, setPhone] = useState(props.phone);
  const [country, setCountry] = useState(props.country);
  const [avatarUrl, setAvatarUrl] = useState(props.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFileViaPresignedPost("/api/uploads/avatar", file);
      setAvatarUrl(result.publicUrl ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Échec de l'upload.";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function saveProfile() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone, country, avatarUrl: avatarUrl ?? undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setPwSaving(true);
    setPwSaved(false);
    setPwError(null);
    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setPwSaved(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setPwSaving(false);
    }
  }

  const initial = firstName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="stack-sm" style={{ gap: 22 }}>
      <div className="panel card">
        <h3>Photo de profil</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            className="avatar-circle"
            style={avatarUrl ? { background: `url(${avatarUrl}) center/cover` } : undefined}
          >
            {!avatarUrl && initial}
          </div>
          <div>
            <label className="btn btn-ghost btn-mini" style={{ cursor: uploading ? "wait" : "pointer" }}>
              {uploading ? "Envoi..." : "Changer la photo"}
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading} onChange={handleAvatarChange} />
            </label>
            <p className="settings-hint">JPEG, PNG, WEBP ou GIF — 4 Mo max.</p>
          </div>
        </div>
      </div>

      <div className="panel card">
        <h3>Informations personnelles</h3>
        <div className="grid-2 u-mb-4">
          <div>
            <label className="settings-label">Prénom</label>
            <input className="settings-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="settings-label">Nom</label>
            <input className="settings-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div>
            <label className="settings-label">Téléphone</label>
            <input className="settings-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="settings-label">Pays</label>
            <input className="settings-input" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
        </div>

        <div className="u-mb-5">
          <label className="settings-label">Email</label>
          <input className="settings-input" value={props.email} disabled />
          <p className="settings-hint">
            L&apos;adresse email n&apos;est pas modifiable ici — contactez le support si besoin.
          </p>
        </div>

        {error && <p className="settings-error">{error}</p>}

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          {saved && <span className="settings-success">Enregistré.</span>}
        </div>
      </div>

      {props.hasPassword && (
        <div className="panel card">
          <h3>Mot de passe</h3>
          <div className="grid-2 u-mb-4">
            <div>
              <label className="settings-label">Mot de passe actuel</label>
              <div className="pw-field">
                <input
                  type={showCurrentPw ? "text" : "password"}
                  className="settings-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <span className="pw-toggle" onClick={() => setShowCurrentPw((v) => !v)}>
                  {showCurrentPw ? "Masquer" : "Afficher"}
                </span>
              </div>
            </div>
            <div>
              <label className="settings-label">Nouveau mot de passe</label>
              <div className="pw-field">
                <input
                  type={showNewPw ? "text" : "password"}
                  className="settings-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <span className="pw-toggle" onClick={() => setShowNewPw((v) => !v)}>
                  {showNewPw ? "Masquer" : "Afficher"}
                </span>
              </div>
            </div>
          </div>
          {pwError && <p className="settings-error">{pwError}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              className="btn btn-ghost"
              onClick={changePassword}
              disabled={pwSaving || !currentPassword || newPassword.length < 8}
            >
              {pwSaving ? "..." : "Changer le mot de passe"}
            </button>
            {pwSaved && <span className="settings-success">Mot de passe mis à jour.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
