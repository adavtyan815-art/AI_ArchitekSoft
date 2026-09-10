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
      <div className="grid gap-4 text-sm">
        <div>
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{labels.sources}</div>
          <ul className="space-y-1.5">
            {sourceRows.slice(0, 5).map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-3">
                <span className="truncate text-fg-2">{r.label}</span>
                <span className="font-medium tabular-nums text-fg">{r.c}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{labels.projectTypes}</div>
          <ul className="space-y-1.5">
            {typeRows.slice(0, 5).map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-3">
                <span className="truncate text-fg-2">{r.label}</span>
                <span className="font-medium tabular-nums text-fg">{r.c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
