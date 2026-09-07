"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PasswordField } from "@/components/PasswordField";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms) {
      setError("Vous devez accepter les conditions d'utilisation.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Une erreur est survenue.");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (signInRes?.error) {
      setError("Compte créé, mais la connexion automatique a échoué. Connectez-vous avec vos identifiants.");
      router.replace("/login");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-wrap">
      <div className="panel auth-card">
        <div className="auth-title">Bienvenue dans l&apos;univers VANTA</div>
        <div className="auth-sub">Créez votre compte pour découvrir les offres.</div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="field">
              <input type="text" placeholder=" " required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <label>Prénom</label>
            </div>
            <div className="field">
              <input type="text" placeholder=" " required value={lastName} onChange={(e) => setLastName(e.target.value)} />
              <label>Nom</label>
            </div>
          </div>
          <div className="field">
            <input type="email" placeholder=" " required value={email} onChange={(e) => setEmail(e.target.value)} />
            <label>Adresse email</label>
          </div>
          <PasswordField
            label="Mot de passe (8 caractères min.)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            autoComplete="new-password"
          />

          <div className="terms">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              J&apos;accepte les <Link href="/terms">conditions d&apos;utilisation</Link> et la{" "}
              <Link href="/privacy">politique de confidentialité</Link>.
            </span>
          </div>

          {error && <p style={{ color: "var(--neon)", fontSize: 12, marginBottom: 14 }}>{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Création en cours..." : "Créer mon compte"}
          </button>
        </form>

        <div className="auth-switch">
          Déjà un compte ? <Link href="/login"><b>Se connecter</b></Link>
        </div>
      </div>
    </div>
  );
}
