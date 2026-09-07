"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

function formatCompact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1000)}k`;
  return String(v);
}

export function RevenueChart({ data }: { data: { month: string; revenue: number }[] }) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
          <XAxis dataKey="month" stroke="#948dab" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#948dab" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatCompact} width={48} />
          <Tooltip
            contentStyle={{ background: "#14161c", border: "1px solid rgba(255,255,255,.12)", borderRadius: 4, fontSize: 12 }}
            labelStyle={{ color: "#fff" }}
            formatter={(v: number) => [`${v.toLocaleString("fr-FR")} FCFA`, "Revenu"]}
          />
          <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} dot={{ fill: "#22d3ee", r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
