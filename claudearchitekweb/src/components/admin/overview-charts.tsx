"use client";

import dynamic from "next/dynamic";

export type OverviewChartLabels = {
  empty: string;
  sources: string;
  projectTypes: string;
  b2b: string;
  b2c: string;
};

type Props = {
  leadsByDay: { day: string; b2b: number; b2c: number }[];
  sourceRows: { label: string; c: number }[];
  typeRows: { label: string; c: number }[];
  labels: OverviewChartLabels;
};

/** recharts is heavy — it is pulled in only once this panel is on screen. */
const OverviewBars = dynamic(() => import("./overview-bars"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

export function OverviewCharts({ leadsByDay, sourceRows, typeRows, labels }: Props) {
  const data = leadsByDay.map((d) => ({ ...d, day: d.day.slice(5) }));
  return (
    <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
      <div className="h-56">
        {data.length === 0 ? <div className="flex h-full items-center justify-center text-sm text-muted">{labels.empty}</div> : <OverviewBars data={data} b2bLabel={labels.b2b} b2cLabel={labels.b2c} />}
      </div>
      <div className="grid gap-5 text-[13.5px]">
        <div>
          <div className="mb-1 border-b border-line pb-1.5 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{labels.sources}</div>
          <ul className="divide-y divide-line">
            {sourceRows.slice(0, 5).map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-3 py-1.5">
                <span className="truncate text-fg-2">{r.label}</span>
                <span className="num text-fg">{r.c}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-1 border-b border-line pb-1.5 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{labels.projectTypes}</div>
          <ul className="divide-y divide-line">
            {typeRows.slice(0, 5).map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-3 py-1.5">
                <span className="truncate text-fg-2">{r.label}</span>
                <span className="num text-fg">{r.c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
