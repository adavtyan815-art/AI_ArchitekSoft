"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Props = {
  leadsByDay: { day: string; b2b: number; b2c: number }[];
  stageRows: { stage: string; c: number }[];
  sourceRows: { source: string | null; c: number }[];
  typeRows: { type: string; c: number }[];
};

export function OverviewCharts({ leadsByDay, sourceRows, typeRows }: Props) {
  const data = leadsByDay.map((d) => ({ ...d, day: d.day.slice(5) }));
  return (
    <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
      <div className="h-56">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-500">No leads in the last 30 days yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#eceae5" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "#f3f4f6" }} contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e0", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="b2b" name="B2B" stackId="a" fill="#111827" radius={[0, 0, 0, 0]} />
              <Bar dataKey="b2c" name="B2C" stackId="a" fill="#2f6fed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="grid gap-4 text-sm">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Lead sources</div>
          <ul className="space-y-1.5">
            {sourceRows.slice(0, 5).map((r) => (
              <li key={r.source ?? "?"} className="flex items-center justify-between">
                <span className="capitalize text-ink-700">{r.source ?? "unknown"}</span>
                <span className="font-medium text-ink-900">{r.c}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Project types</div>
          <ul className="space-y-1.5">
            {typeRows.slice(0, 5).map((r) => (
              <li key={r.type} className="flex items-center justify-between">
                <span className="capitalize text-ink-700">{r.type}</span>
                <span className="font-medium text-ink-900">{r.c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
