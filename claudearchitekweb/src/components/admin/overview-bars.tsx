"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AXIS = { fontSize: 10, fill: "var(--muted)", fontFamily: "var(--font-mono)" } as const;
const TOOLTIP = { borderRadius: 4, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--fg)", fontSize: 11, fontFamily: "var(--font-mono)" } as const;

/** Stacked B2B/B2C bar chart — ink + accent only, square corners, hairline grid. */
export default function OverviewBars({ data, b2bLabel, b2cLabel }: { data: { day: string; b2b: number; b2c: number }[]; b2bLabel: string; b2cLabel: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -14, bottom: 0 }} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="0" />
        <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--line)" }} minTickGap={12} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={38} />
        <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={TOOLTIP} itemStyle={{ color: "var(--fg)" }} labelStyle={{ color: "var(--muted)" }} />
        <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }} />
        <Bar dataKey="b2b" name={b2bLabel} stackId="a" fill="var(--fg)" />
        <Bar dataKey="b2c" name={b2cLabel} stackId="a" fill="var(--accent)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
