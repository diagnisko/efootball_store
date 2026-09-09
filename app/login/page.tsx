"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PasswordField } from "@/components/PasswordField";

function GoogleGLogo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" style={{ width: 22, height: 22, display: "block" }}>
      <path d="M32 20.7c5.5 0 9.7 1.9 13.4 5.5l9.8-9.8C47.2 6.6 40.3 3.4 32 3.4 19.8 3.4 9.2 10.6 3.9 20.5l11.5 8.9c2.8-8.4 10.7-14.7 16.6-14.7Z" fill="#EA4335" opacity="0.9"/>
      <path d="M32 51.5c-5.6 0-10.3-1.8-13.8-5.2l-11 8.5C11.1 61.7 21.1 67 32 67c8.6 0 15.8-2.8 21.1-8.3l-10.3-8c-2.8 1.9-6.4 3-10.8 3Z" fill="#34A853" opacity="0.9"/>
      <path d="M69.8 30.5H32v12h17.6c-1.9 6.2-7.3 10.9-17.6 10.9-10.7 0-19.4-8.7-19.4-19.4S21.3 15 32 15c5.4 0 10.2 2 13.8 5.9l9.4-9.4C47.4 5.5 40.3 2 32 2 15.4 2 2 15.4 2 32s13.4 30 30 30c17.4 0 28.9-12.2 28.9-29.4 0-2.5-.3-4.8-.9-7.1Z" fill="#4285F4" opacity="0.9"/>
      <path d="M32 20.7c5.5 0 9.7 1.9 13.4 5.5l9.8-9.8C47.2 6.6 40.3 3.4 32 3.4 19.8 3.4 9.2 10.6 3.9 20.5l11.5 8.9c2.8-8.4 10.7-14.7 16.6-14.7Z" fill="#FBBC05" opacity="0.95"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl: "/post-login",
    });
    setLoading(false);
    if (!result || result.error) {
      setError(result?.error === "TOO_MANY_ATTEMPTS"
        ? "Trop de tentatives. Réessayez dans quelques minutes."
        : "Email ou mot de passe incorrect.");
      return;
    }
    router.push(result.url ?? "/post-login");
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
          <button
            className="btn btn-social btn-block"
            onClick={() => signIn("google", { callbackUrl: "/post-login" })}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
          >
            <GoogleGLogo />
            <span>Continuer avec Google</span>
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
