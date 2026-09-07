"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PasswordField } from "@/components/PasswordField";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!token) {
      setError("Lien invalide — aucun jeton trouvé dans l'URL.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError((await res.json()).error || "Une erreur est survenue.");
      return;
    }
    setDone(true);
  }

  return (
    <div className="auth-wrap">
      <div className="panel auth-card">
        {done ? (
          <>
            <div className="auth-title">Votre mot de passe a été modifié</div>
            <div className="auth-sub">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</div>
            <button className="btn btn-primary btn-block" onClick={() => router.push("/login")}>
              Se connecter
            </button>
          </>
        ) : (
          <>
            <div className="auth-title">Nouveau mot de passe</div>
            <div className="auth-sub">Choisissez un nouveau mot de passe pour votre compte.</div>
            <form onSubmit={handleSubmit}>
              <PasswordField
                label="Nouveau mot de passe (8 caractères min.)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
              />
              <PasswordField
                label="Confirmer le mot de passe"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
              {error && <p style={{ color: "var(--neon)", fontSize: 12, marginBottom: 14 }}>{error}</p>}
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? "Enregistrement..." : "Réinitialiser mon mot de passe"}
              </button>
            </form>
            <div className="auth-switch">
              <Link href="/login"><b>Retour à la connexion</b></Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="page-loader"><div className="ring" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
