"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true); // toujours affiché, que l'email existe ou non
  }

  return (
    <div className="auth-wrap">
      <div className="panel auth-card">
        {sent ? (
          <>
            <div className="auth-title">Vérifiez votre boîte email</div>
            <div className="auth-sub">
              Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien de
              réinitialisation dans quelques instants. Pensez à vérifier vos spams.
            </div>
            <Link href="/login" className="btn btn-ghost btn-block">Retour à la connexion</Link>
          </>
        ) : (
          <>
            <div className="auth-title">Mot de passe oublié ?</div>
            <div className="auth-sub">Saisissez votre email, nous vous enverrons un lien sécurisé de réinitialisation.</div>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <input type="email" placeholder=" " required value={email} onChange={(e) => setEmail(e.target.value)} />
                <label>Adresse email</label>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? "Envoi..." : "Envoyer le lien"}
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
