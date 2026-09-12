"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const STEP_LABELS = ["Bienvenue", "Profil", "Vérification", "Dossier"];

export default function VerificationPage() {
  const { data: session, status } = useSession();
  const [step, setStep] = useState(1);

  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [locationConsent, setLocationConsent] = useState(false);
  const [documentType, setDocumentType] = useState<"NATIONAL_ID" | "PASSPORT" | "OTHER">("NATIONAL_ID");
  const [frontKey, setFrontKey] = useState<string | null>(null);
  const [backKey, setBackKey] = useState<string | null>(null);
  const [facePhotoKey, setFacePhotoKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, slot: "front" | "back" | "face") {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slot", slot);
      const response = await fetch("/api/uploads/identity-document", { method: "POST", body: formData });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Échec de l'upload.");
      if (slot === "front") setFrontKey(result.key);
      if (slot === "back") setBackKey(result.key);
      if (slot === "face") setFacePhotoKey(result.key);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Échec de l'upload.");
      if (slot === "front") setFrontKey(null);
      if (slot === "back") setBackKey(null);
      if (slot === "face") setFacePhotoKey(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/verification/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, country, documentType, frontKey, backKey, facePhotoKey, locationConsent }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Une erreur est survenue.");
      return;
    }
    setStep(4);
  }

  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  return (
    <div className="auth-wrap">
      <div className="panel auth-card verification-shell" style={{ width: 480 }}>
        {step < 4 && (
          <div className="verification-stepper">
            <div className="rail verification-rail" style={{ marginBottom: 8 }}>
              {[1, 2, 3].map((s) => (
                <div key={s} className={`rail-seg ${s < step ? "filled" : s === step ? "current" : ""}`} />
              ))}
            </div>
            <div className="verification-step-label">
              Étape {step} sur 3 — {STEP_LABELS[step - 1]}
            </div>
          </div>
        )}

        {/* ---------- Étape 1 : Bienvenue ---------- */}
        {step === 1 && (
          <>
            <div className="verification-hero">
              <div className="verification-hero-badge">VANTA</div>
              <div className="auth-title">Bienvenue dans l&apos;univers VANTA{firstName ? `, ${firstName}` : ""}</div>
            </div>
            <div className="auth-sub">
              Avant de pouvoir acheter un compte, deux étapes simples : complétez votre profil,
              puis vérifiez votre identité. Ça prend moins de deux minutes.
            </div>
            <div className="verification-card-list">
              <div className="verification-card-item">
                <strong>1</strong>
                <span>Compléter le profil</span>
              </div>
              <div className="verification-card-item">
                <strong>2</strong>
                <span>Soumettre les documents</span>
              </div>
            </div>
            <button className="btn btn-primary btn-block" onClick={() => setStep(2)}>
              Commencer
            </button>
          </>
        )}

        {/* ---------- Étape 2 : Profil ---------- */}
        {step === 2 && (
          <>
            <div className="auth-title">Complétez votre profil</div>
            <div className="auth-sub">Ces informations nous permettent de vous contacter si besoin.</div>
            <div className="field">
              <input type="tel" placeholder=" " required value={phone} onChange={(e) => setPhone(e.target.value)} />
              <label>Numéro de téléphone</label>
            </div>
            <div className="field">
              <input type="text" placeholder=" " required value={country} onChange={(e) => setCountry(e.target.value)} />
              <label>Pays</label>
            </div>
            <div className="verification-submit-actions">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>Retour</button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={!phone.trim() || !country.trim()}
                onClick={() => setStep(3)}
              >
                Continuer
              </button>
            </div>
          </>
        )}

        {/* ---------- Étape 3 : Vérification d'identité ---------- */}
        {step === 3 && (
          <>
            <div className="auth-title">Vérification d&apos;identité</div>
            <div className="auth-sub">Pour accéder aux achats, votre identité doit être vérifiée.</div>
            <div className="verification-privacy-note" role="note">
              <strong>Vos documents restent confidentiels.</strong>
              <span>
                Ils sont stockés dans un espace privé et ne sont accessibles qu&apos;aux membres
                autorisés de VANTA pour vérifier votre dossier. Ils ne sont pas publiés ni partagés
                avec d&apos;autres utilisateurs.
              </span>
            </div>

            <label className="verification-consent">
              <input
                type="checkbox"
                checked={locationConsent}
                onChange={(e) => setLocationConsent(e.target.checked)}
              />
              <span>J&apos;accepte de partager ma localisation avec VANTA pour sécuriser la remise de l&apos;article. Cette autorisation est enregistrée avec mon dossier.</span>
            </label>

            <div className="u-mb-4">
              <label className="settings-label">Type de document</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as typeof documentType)}
                className="settings-input"
              >
                <option value="NATIONAL_ID">Carte nationale d&apos;identité</option>
                <option value="PASSPORT">Passeport</option>
                <option value="OTHER">Autre document</option>
              </select>
            </div>

            <div className="verification-upload-grid">
              <div className="verification-upload-box">
                <label className="settings-label">Document (recto)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange(e, "front")}
                  disabled={uploading}
                  className="u-muted"
                />
                {uploading && <p className="settings-hint" style={{ color: "var(--cyan)" }}>Envoi en cours...</p>}
                {frontKey && !uploading && (
                  <p className="settings-hint" style={{ color: "var(--ok)" }}>✓ Document envoyé.</p>
                )}
              </div>

              <div className="verification-upload-box">
                <label className="settings-label">Document (verso)</label>
                <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, "back")} disabled={uploading} className="u-muted" />
                {backKey && !uploading && <p className="settings-hint" style={{ color: "var(--ok)" }}>✓ Verso envoyé.</p>}
              </div>

              <div className="verification-upload-box verification-upload-box-wide">
                <label className="settings-label">Photo claire de votre visage</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "face")} disabled={uploading} className="u-muted" />
                {facePhotoKey && !uploading && <p className="settings-hint" style={{ color: "var(--ok)" }}>✓ Photo envoyée.</p>}
              </div>
            </div>

            {uploadError && <p className="settings-error">{uploadError}</p>}
            {error && <p className="settings-error">{error}</p>}

            <div className="verification-submit-actions">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(2)} disabled={loading}>Retour</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading || !locationConsent || !frontKey || !backKey || !facePhotoKey}>
                {loading ? "Envoi..." : "Soumettre pour vérification"}
              </button>
            </div>
          </>
        )}

        {/* ---------- Étape 4 : Dossier en attente ---------- */}
        {step === 4 && (
          <div className="verification-success" style={{ textAlign: "center" }}>
            <div className="verification-success-icon">🟡</div>
            <div className="auth-title">Votre dossier est en cours de vérification</div>
            <p className="auth-sub">
              Notre équipe examine actuellement vos informations. Vous recevrez une notification
              dès que votre profil sera validé. Vous pouvez continuer à consulter le catalogue
              en attendant.
            </p>
            <button className="btn btn-primary btn-block" onClick={() => router.push("/dashboard")}>
              Retour au dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
