"use client";

/**
 * Recharts implementations. Loaded only through next/dynamic from ./charts.tsx so the
 * chart bundle never reaches the critical path. Colours are semantic CSS variables, so
 * the charts follow light / dark mode without any JS.
 */
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AXIS = { fontSize: 11, fill: "var(--muted)" } as const;
const TOOLTIP = { borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--fg)", fontSize: 12 } as const;
const GRID = "var(--line)";

export type ViewsRow = { day: string; views: number; visitors: number; leads: number };
export type RevenueRow = { month: string; quoted: number; paid: number; projects: number };
export type PostsRow = { month: string; created: number; published: number };

export function ViewsByDayImpl({ data, labels }: { data: ViewsRow[]; labels: { views: string; visitors: string; submits: string } }) {
  const rows = data.map((d) => ({ ...d, day: d.day.slice(5) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "var(--surface-2)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="views" name={labels.views} stroke="var(--accent)" fill="url(#gViews)" strokeWidth={2} />
        <Line type="monotone" dataKey="visitors" name={labels.visitors} stroke="var(--fg)" strokeWidth={1.5} dot={false} />
        <Line type="monotone" dataKey="leads" name={labels.submits} stroke="var(--success)" strokeWidth={1.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function RevenueImpl({ data, labels }: { data: RevenueRow[]; labels: { quoted: string; paid: string } }) {
  const rows = data.map((d) => ({ ...d, month: d.month.slice(2) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
        <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "var(--surface-2)" }} formatter={(v) => new Intl.NumberFormat("en-US").format(Number(v ?? 0))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="quoted" name={labels.quoted} fill="var(--accent-soft)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="paid" name={labels.paid} fill="var(--accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PostsImpl({ data, labels }: { data: PostsRow[]; labels: { created: string; published: string } }) {
  const rows = data.map((d) => ({ ...d, month: d.month.slice(2) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "var(--surface-2)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="created" name={labels.created} fill="var(--surface-3)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="published" name={labels.published} fill="var(--fg)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
