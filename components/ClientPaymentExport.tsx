"use client";

import { useState } from "react";

export function ClientPaymentExport({ clientId }: { clientId: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function download() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.location.href = `/api/admin/clients/${clientId}/payments/export?${params.toString()}`;
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap", marginBottom: 16 }}>
      <label style={{ fontSize: 12, color: "var(--bo-muted)" }}>
        Du
        <input className="bo-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
      </label>
      <label style={{ fontSize: 12, color: "var(--bo-muted)" }}>
        Au
        <input className="bo-input" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
      </label>
      <button className="bo-btn bo-btn-primary" onClick={download}>Télécharger l&apos;historique CSV</button>
    </div>
  );
}