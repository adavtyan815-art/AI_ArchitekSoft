import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = ["request", "survey", "design", "configuration", "approval", "production_prep", "production", "installation", "handover"] as const;

/** Horizontal project-stage stepper (server component). "archived" is never shown. */
export function StageStepper({ current, labels, statusLabel }: { current: string; labels: Record<string, string>; statusLabel?: string }) {
  const idx = STAGES.indexOf(current as (typeof STAGES)[number]);
  const currentIdx = current === "archived" ? STAGES.length - 1 : idx;
  const currentLabel = labels[current] ?? current;

  return (
    <div className="card p-4 sm:p-5">
      {/* Mobile: compact "step X of N" + label + progress bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-500">
          <span>{statusLabel}</span>
          <span>
            {Math.max(currentIdx, 0) + 1} / {STAGES.length}
          </span>
        </div>
        <div className="mt-1.5 text-base font-semibold text-ink-950">{currentLabel}</div>
        <div className="mt-3 flex gap-1">
          {STAGES.map((s, i) => (
            <span key={s} className={cn("h-1.5 flex-1 rounded-full", i < currentIdx ? "bg-brand-500" : i === currentIdx ? "bg-brand-500" : "bg-ink-200")} />
          ))}
        </div>
      </div>

      {/* Desktop: full stepper */}
      <ol className="hidden sm:flex sm:items-start">
        {STAGES.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <li key={s} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
              {i > 0 ? <span className={cn("absolute top-3.5 right-1/2 left-[-50%] h-0.5", i <= currentIdx ? "bg-brand-500" : "bg-ink-200")} /> : null}
              <span
                className={cn(
                  "relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold",
                  done && "border-brand-500 bg-brand-500 text-white",
                  active && "border-brand-500 bg-white text-brand-600 ring-4 ring-brand-100",
                  !done && !active && "border-ink-200 bg-white text-ink-400"
                )}
              >
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("mt-2 px-1 text-[11px] leading-tight lg:text-xs", active ? "font-semibold text-ink-950" : done ? "text-ink-700" : "text-ink-500")}>{labels[s] ?? s}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
