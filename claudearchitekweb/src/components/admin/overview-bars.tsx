"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Stacked B2B/B2C bar chart. Loaded lazily so recharts stays out of the initial admin bundle. */
export default function OverviewBars({ data, b2bLabel, b2cLabel }: { data: { day: string; b2b: number; b2c: number }[]; b2bLabel: string; b2cLabel: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--fg)", fontSize: 12 }} itemStyle={{ color: "var(--fg)" }} labelStyle={{ color: "var(--muted)" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
        <Bar dataKey="b2b" name={b2bLabel} stackId="a" fill="var(--fg)" />
        <Bar dataKey="b2c" name={b2cLabel} stackId="a" fill="var(--accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
