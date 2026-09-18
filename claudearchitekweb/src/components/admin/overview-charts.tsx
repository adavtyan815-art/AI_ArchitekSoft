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
    // `min-w-0` on both tracks: an `fr` track floors at its content's min-content width, so the
    // source / project-type lists on the right were squeezing the chart into ~150px on first paint.
    <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
      <div className="h-56 w-full min-w-0">
        {data.length === 0 ? <div className="flex h-full items-center justify-center text-sm text-muted">{labels.empty}</div> : <OverviewBars data={data} b2bLabel={labels.b2b} b2cLabel={labels.b2c} />}
      </div>
      <div className="grid min-w-0 gap-5 text-[13.5px]">
        <div>
          <div className="mb-1 border-b border-line pb-1.5 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{labels.sources}</div>
          {/* Both lists are 30-day lead breakdowns, so the chart's own "no leads in the last
              30 days" wording fits them too — a bare heading over nothing did not. */}
          {sourceRows.length === 0 ? (
            <div className="py-1.5 text-sm text-muted">{labels.empty}</div>
          ) : (
            <ul className="divide-y divide-line">
              {sourceRows.slice(0, 5).map((r) => (
                <li key={r.label} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="truncate text-fg-2">{r.label}</span>
                  <span className="num text-fg">{r.c}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="mb-1 border-b border-line pb-1.5 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{labels.projectTypes}</div>
          {typeRows.length === 0 ? (
            <div className="py-1.5 text-sm text-muted">{labels.empty}</div>
          ) : (
            <ul className="divide-y divide-line">
              {typeRows.slice(0, 5).map((r) => (
                <li key={r.label} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="truncate text-fg-2">{r.label}</span>
                  <span className="num text-fg">{r.c}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
