"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProofUploadField } from "@/components/ProofUploadField";

interface Props {
  productSlug: string;
  productStatus: "AVAILABLE" | "IN_PROGRESS" | "SOLD" | "HIDDEN";
  priceTotal: number;
  initialDepositAmount: number;
  installmentsCount: number;
  isAuthenticated: boolean;
  isStaff: boolean;
  verificationStatus?: string;
  myPurchase: { id: string; status: string; depositStatus?: string } | null;
}

export function PurchaseButton({
  productSlug,
  productStatus,
  priceTotal,
  initialDepositAmount,
  installmentsCount,
  isAuthenticated,
  isStaff,
  verificationStatus,
  myPurchase,
}: Props) {
  const [step, setStep] = useState<"idle" | "confirm" | "deposit">("idle");
  const [reference, setReference] = useState("");
  const [comment, setComment] = useState("");
  const [proofKey, setProofKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // -------- Non connecté --------
  if (!isAuthenticated) {
    return (
      <Link href="/login" className="btn btn-primary btn-block">
        Se connecter pour acheter
      </Link>
    );
  }

  if (isStaff) {
    return <button className="btn btn-ghost btn-block" disabled>Achat réservé aux clients</button>;
  }

  // -------- Non vérifié --------
  if (verificationStatus !== "VERIFIED") {
    return (
      <Link href="/verification" className="btn btn-primary btn-block">
        Vérification requise
      </Link>
    );
  }

  // -------- Le client a déjà un achat sur cette offre --------
  if (myPurchase) {
    if (myPurchase.status === "AWAITING_DEPOSIT" && ["PENDING", "REJECTED"].includes(myPurchase.depositStatus ?? "")) {
      return (
        <>
          <button className="btn btn-primary btn-block" onClick={() => setStep("deposit")}>
            Déclarer mon apport initial
          </button>
          {step === "deposit" && (
            <div className="modal-bg show" onClick={() => !loading && setStep("idle")}>
              <div className="panel modal" onClick={(e) => e.stopPropagation()}>
                <h3>Déclarer votre apport initial</h3>
                <p className="hint">
                  {initialDepositAmount.toLocaleString("fr-FR")} FCFA. Ajoutez une référence si
                  disponible.
                </p>
                <input
                  type="text"
                  placeholder="Référence de transaction (optionnel)"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  style={{ width: "100%", background: "rgba(255,255,255,.03)", border: "1px solid var(--glass-border-soft)", color: "var(--ivory)", padding: 12, marginBottom: 14, outline: "none" }}
                />
                <textarea rows={3} placeholder="Commentaire (optionnel)" value={comment} onChange={(e) => setComment(e.target.value)} />
                <ProofUploadField onUploaded={setProofKey} />
                {error && <p style={{ color: "var(--neon)", fontSize: 12, marginBottom: 10 }}>{error}</p>}
                <div className="modal-actions">
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep("idle")} disabled={loading}>Annuler</button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      setError(null);
                      try {
                        const res = await fetch(`/api/purchases/${myPurchase.id}/deposit/declare`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ reference, comment, proofUrl: proofKey }),
                        });
                        if (!res.ok) throw new Error((await res.json()).error);
                        router.push("/dashboard");
                        router.refresh();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Erreur.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    {loading ? "Envoi..." : "Confirmer l'envoi"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }
    return (
      <Link href="/dashboard" className="btn btn-ghost btn-block">
        Suivre mon achat dans mon dashboard
      </Link>
    );
  }

  // -------- Offre non disponible (réservée par un autre / vendue) --------
  if (productStatus === "IN_PROGRESS") {
    return <button className="btn btn-ghost btn-block" disabled>En cours de paiement — indisponible</button>;
  }
  if (productStatus === "SOLD") {
    return <button className="btn btn-ghost btn-block" disabled>Vendue</button>;
  }

  // -------- Disponible : lancer l'achat --------
  const remaining = priceTotal - initialDepositAmount;
  const monthly = Math.round(remaining / installmentsCount);

  return (
    <>
      <button className="btn btn-primary btn-block" onClick={() => setStep("confirm")}>
        Acheter
      </button>
      {step === "confirm" && (
        <div className="modal-bg show" onClick={() => !loading && setStep("idle")}>
          <div className="panel modal" onClick={(e) => e.stopPropagation()}>
            <h3>Conditions financières</h3>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.8, marginBottom: 20 }}>
              <div>Prix total : <strong style={{ color: "#fff" }}>{priceTotal.toLocaleString("fr-FR")} FCFA</strong></div>
              <div>Apport initial : <strong style={{ color: "#fff" }}>{initialDepositAmount.toLocaleString("fr-FR")} FCFA</strong></div>
              <div>Montant restant : <strong style={{ color: "#fff" }}>{remaining.toLocaleString("fr-FR")} FCFA</strong></div>
              <div>Durée : <strong style={{ color: "#fff" }}>{installmentsCount} mois</strong></div>
              <div>Mensualité estimée : <strong style={{ color: "#fff" }}>{monthly.toLocaleString("fr-FR")} FCFA</strong></div>
            </div>
            {error && <p style={{ color: "var(--neon)", fontSize: 12, marginBottom: 10 }}>{error}</p>}
            <div className="modal-actions">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep("idle")} disabled={loading}>Annuler</button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    const res = await fetch(`/api/products/${productSlug}/purchase`, { method: "POST" });
                    if (!res.ok) throw new Error((await res.json()).error);
                    router.refresh();
                    setStep("idle");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Erreur.");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? "Confirmation..." : "Confirmer l'achat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
