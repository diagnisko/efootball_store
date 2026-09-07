"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

interface Rule {
  gracePeriodDays: number;
  penaltyType: "FIXED" | "PERCENTAGE";
  penaltyValue: number;
  maxLateDaysBeforeSuspension: number;
  maxLateDaysBeforeCancellation: number;
}

export function LateRulesForm({ initial }: { initial: Rule }) {
  const [data, setData] = useState<Rule>(initial);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--bo-panel-2)",
    border: "1px solid var(--bo-border)", color: "var(--bo-text)",
    padding: 12, fontSize: 14, fontFamily: "Manrope", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: "var(--bo-muted-2)", letterSpacing: ".06em",
    textTransform: "uppercase", display: "block", marginBottom: 8,
  };

  async function save() {
    setLoading(true);
    setSaved(false);
    const res = await fetch("/api/admin/settings/late-rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    } else {
      toast.error("Une erreur est survenue.");
    }
  }

  return (
    <div className="bo-panel bo-panel-pad" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="grid-2">
        <div>
          <label style={labelStyle}>Délai de grâce (jours)</label>
          <input type="number" min={0} style={inputStyle} value={data.gracePeriodDays} onChange={(e) => setData({ ...data, gracePeriodDays: Number(e.target.value) })} />
        </div>
        <div>
          <label style={labelStyle}>Type de pénalité</label>
          <select style={inputStyle} value={data.penaltyType} onChange={(e) => setData({ ...data, penaltyType: e.target.value as Rule["penaltyType"] })}>
            <option value="PERCENTAGE">Pourcentage du montant dû</option>
            <option value="FIXED">Montant fixe</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>
            Valeur de la pénalité {data.penaltyType === "PERCENTAGE" ? "(%)" : "(FCFA)"}
          </label>
          <input type="number" min={0} style={inputStyle} value={data.penaltyValue} onChange={(e) => setData({ ...data, penaltyValue: Number(e.target.value) })} />
        </div>
        <div />
        <div>
          <label style={labelStyle}>Suspension après (jours de retard)</label>
          <input type="number" min={1} style={inputStyle} value={data.maxLateDaysBeforeSuspension} onChange={(e) => setData({ ...data, maxLateDaysBeforeSuspension: Number(e.target.value) })} />
        </div>
        <div>
          <label style={labelStyle}>Annulation après (jours de retard)</label>
          <input type="number" min={1} style={inputStyle} value={data.maxLateDaysBeforeCancellation} onChange={(e) => setData({ ...data, maxLateDaysBeforeCancellation: Number(e.target.value) })} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button className="bo-btn bo-btn-primary" onClick={save} disabled={loading}>
          {loading ? "Enregistrement..." : "Enregistrer les règles"}
        </button>
        {saved && <span style={{ color: "var(--ok)", fontSize: 13 }}>Enregistré.</span>}
      </div>
    </div>
  );
}
