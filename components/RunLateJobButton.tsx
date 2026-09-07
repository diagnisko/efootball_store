"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export function RunLateJobButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/cron/late-payments", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur.");
      setResult(data);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="bo-btn" onClick={run} disabled={loading}>
        {loading ? "Exécution..." : "Exécuter le job maintenant"}
      </button>
      {result && (
        <p style={{ fontSize: 12, color: "var(--bo-muted)", marginTop: 10 }}>
          Rappels envoyés : {String(result.remindersSent)} · Nouveaux retards : {String(result.newlyLate)} ·
          {" "}Suspensions : {String(result.suspended)} · Annulations : {String(result.cancelled)}
          {Array.isArray(result.errors) && result.errors.length > 0 && (
            <span style={{ color: "var(--neon)" }}> · Erreurs : {result.errors.length}</span>
          )}
        </p>
      )}
    </div>
  );
}
