"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PasswordField } from "@/components/PasswordField";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error === "TOO_MANY_ATTEMPTS") {
      setLoading(false);
      setError("Trop de tentatives échouées. Réessayez dans 15 minutes ou réinitialisez votre mot de passe.");
      return;
    }
    if (res?.error) {
      setLoading(false);
      setError("Email ou mot de passe incorrect.");
      return;
    }

    // Redirection intelligente selon le rôle (section 6.14 du cahier des charges) : un
    // Manager/Super Admin ne doit jamais atterrir sur le dashboard client après connexion.
    let session = await getSession();
    for (let attempt = 0; !session && attempt < 3; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      session = await getSession();
    }
    const role = (session?.user as { role?: string } | undefined)?.role;
    setLoading(false);
    const destination = role === "SUPER_ADMIN"
      ? "/admin/dashboard"
      : role === "MANAGER"
        ? "/manager/verifications"
        : "/dashboard";
    router.replace(destination);
    router.refresh();
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
