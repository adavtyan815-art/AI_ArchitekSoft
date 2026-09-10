"use client";

/**
 * Recharts implementations. Loaded only through next/dynamic from ./charts.tsx so the
 * chart bundle never reaches the critical path. Palette is limited to accent / fg / muted /
 * line (design system v3), so the charts follow light / dark mode without any JS.
 */
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AXIS = { fontSize: 10, fill: "var(--muted)", fontFamily: "var(--font-mono)" } as const;
const TOOLTIP = { borderRadius: 4, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--fg)", fontSize: 11, fontFamily: "var(--font-mono)" } as const;
const LEGEND = { fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--muted)" };
const GRID = "var(--line)";

export type ViewsRow = { day: string; views: number; visitors: number; leads: number };
export type RevenueRow = { month: string; quoted: number; paid: number; projects: number };
export type PostsRow = { month: string; created: number; published: number };

export function ViewsByDayImpl({ data, labels }: { data: ViewsRow[]; labels: { views: string; visitors: string; submits: string } }) {
  const rows = data.map((d) => ({ ...d, day: d.day.slice(5) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 6, right: 6, left: -6, bottom: 0 }}>
        <defs>
          <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={46} />
        <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "var(--surface-2)" }} />
        <Legend wrapperStyle={LEGEND} />
        <Area type="monotone" dataKey="views" name={labels.views} stroke="var(--accent)" fill="url(#gViews)" strokeWidth={1.5} />
        <Line type="monotone" dataKey="visitors" name={labels.visitors} stroke="var(--fg)" strokeWidth={1.25} dot={false} />
        <Line type="monotone" dataKey="leads" name={labels.submits} stroke="var(--muted)" strokeWidth={1.25} strokeDasharray="3 3" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function RevenueImpl({ data, labels }: { data: RevenueRow[]; labels: { quoted: string; paid: string } }) {
  const rows = data.map((d) => ({ ...d, month: d.month.slice(2) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 6, right: 6, left: -10, bottom: 0 }} barCategoryGap="26%">
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
        <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "var(--surface-2)" }} formatter={(v) => new Intl.NumberFormat("en-US").format(Number(v ?? 0))} />
        <Legend wrapperStyle={LEGEND} />
        <Bar dataKey="quoted" name={labels.quoted} fill="var(--muted)" fillOpacity={0.45} />
        <Bar dataKey="paid" name={labels.paid} fill="var(--accent)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PostsImpl({ data, labels }: { data: PostsRow[]; labels: { created: string; published: string } }) {
  const rows = data.map((d) => ({ ...d, month: d.month.slice(2) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 6, right: 6, left: -22, bottom: 0 }} barCategoryGap="26%">
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={34} />
        <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "var(--surface-2)" }} />
        <Legend wrapperStyle={LEGEND} />
        <Bar dataKey="created" name={labels.created} fill="var(--muted)" fillOpacity={0.45} />
        <Bar dataKey="published" name={labels.published} fill="var(--fg)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
