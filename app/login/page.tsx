"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { PasswordField } from "@/components/PasswordField";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: true,
      callbackUrl: "/post-login",
    });
  }

  return (
    <div className="auth-wrap">
      <div className="panel auth-card">
        <div className="auth-title">Bon retour parmi nous</div>
        <div className="auth-sub">Connectez-vous pour accéder à votre espace personnel.</div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <input
              type="email"
              placeholder=" "
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label>Adresse email</label>
          </div>
          <PasswordField label="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />

          <div style={{ textAlign: "right", marginBottom: 20, marginTop: -6 }}>
            <Link href="/forgot-password" style={{ color: "var(--cyan)", fontSize: 12, textDecoration: "none" }}>
              Mot de passe oublié ?
            </Link>
          </div>

          {error && <p style={{ color: "var(--neon)", fontSize: 12, marginBottom: 14 }}>{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        <div className="divider">ou continuer avec</div>
        <div className="social-row">
          <button className="btn btn-social btn-block" onClick={() => signIn("google", { callbackUrl: "/post-login" })}>
            Continuer avec Google
          </button>
          <button className="btn btn-social btn-block" onClick={() => signIn("apple", { callbackUrl: "/post-login" })}>
            Continuer avec Apple
          </button>
        </div>

        <div className="auth-switch">
          Pas encore de compte ? <Link href="/register"><b>Créer un compte</b></Link>
        </div>
      </div>
    </div>
  );
}
