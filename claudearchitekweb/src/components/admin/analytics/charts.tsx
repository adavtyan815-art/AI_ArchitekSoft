"use client";

import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AXIS = { fontSize: 11, fill: "#6b7280" } as const;
const TOOLTIP = { borderRadius: 12, border: "1px solid #e7e5e0", fontSize: 12 } as const;

function EmptyBox({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-ink-500">{text}</div>;
}

/** Page views / unique visitors / form submits per day. */
export function ViewsByDayChart({ data }: { data: { day: string; views: number; visitors: number; leads: number }[] }) {
  const rows = data.map((d) => ({ ...d, day: d.day.slice(5) }));
  return (
    <div className="h-64">
      {rows.length === 0 ? (
        <EmptyBox text="No traffic recorded in this period yet." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2f6fed" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#2f6fed" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#eceae5" />
            <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="views" name="Page views" stroke="#2f6fed" fill="url(#gViews)" strokeWidth={2} />
            <Line type="monotone" dataKey="visitors" name="Visitors" stroke="#111827" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="leads" name="Form submits" stroke="#16a34a" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/** Quoted vs paid amounts per month (last 6 months). */
export function RevenueChart({ data }: { data: { month: string; quoted: number; paid: number; projects: number }[] }) {
  const rows = data.map((d) => ({ ...d, month: d.month.slice(2) }));
  const empty = rows.every((r) => r.quoted === 0 && r.paid === 0);
  return (
    <div className="h-56">
      {empty ? (
        <EmptyBox text="No quoted or paid amounts on projects yet." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eceae5" />
            <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
            <Tooltip contentStyle={TOOLTIP} formatter={(v) => new Intl.NumberFormat("en-US").format(Number(v ?? 0))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="quoted" name="Quoted" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
            <Bar dataKey="paid" name="Paid" fill="#2f6fed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/** Posts created vs published per month. */
export function PostsChart({ data }: { data: { month: string; created: number; published: number }[] }) {
  const rows = data.map((d) => ({ ...d, month: d.month.slice(2) }));
  const empty = rows.every((r) => r.created === 0 && r.published === 0);
  return (
    <div className="h-56">
      {empty ? (
        <EmptyBox text="No posts yet." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eceae5" />
            <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="created" name="Created" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
            <Bar dataKey="published" name="Published" fill="#111827" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
