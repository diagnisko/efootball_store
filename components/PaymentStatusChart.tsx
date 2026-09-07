"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

const COLORS: Record<string, string> = {
  "Payées": "#34d399",
  "En attente": "#fbbf24",
  "En retard": "#f0359a",
};

export function PaymentStatusChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
          <XAxis dataKey="name" stroke="#948dab" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#948dab" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
          <Tooltip
            contentStyle={{ background: "#14161c", border: "1px solid rgba(255,255,255,.12)", borderRadius: 4, fontSize: 12 }}
            labelStyle={{ color: "#fff" }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={COLORS[d.name] ?? "#7c3aed"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
