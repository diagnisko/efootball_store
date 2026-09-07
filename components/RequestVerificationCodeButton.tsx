"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export function RequestVerificationCodeButton({ purchaseId }: { purchaseId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/verification-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Demande envoyée. Un manager vous fournira le code dès réception.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn btn-ghost btn-mini" onClick={submit} disabled={loading}>
      {loading ? "Envoi..." : "Demander un code de vérification"}
    </button>
  );
}
