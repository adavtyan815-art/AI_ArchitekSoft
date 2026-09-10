import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = ["request", "survey", "design", "configuration", "approval", "production_prep", "production", "installation", "handover"] as const;

/**
 * Project-stage stepper (server component). "archived" is never shown.
 * Mobile: compact — current stage + what comes next + a progress rail.
 * Desktop (sm+): the full nine-step rail.
 */
export function StageStepper({ current, labels, statusLabel, nextWord }: { current: string; labels: Record<string, string>; statusLabel?: string; nextWord?: string }) {
  const idx = STAGES.indexOf(current as (typeof STAGES)[number]);
  const currentIdx = current === "archived" ? STAGES.length - 1 : idx;
  const safeIdx = Math.max(currentIdx, 0);
  const currentLabel = labels[current] ?? current;
  const nextStage = STAGES[safeIdx + 1];
  const nextLabel = nextStage ? (labels[nextStage] ?? nextStage) : null;

  return (
    <div className="card p-4 sm:p-5" role="group" aria-label={statusLabel}>
      {/* Mobile: current + next */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="kicker">{statusLabel}</span>
          <span className="text-[11px] font-semibold text-muted tabular-nums">
            {safeIdx + 1} / {STAGES.length}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent text-[12px] font-bold text-accent-fg">{safeIdx + 1}</span>
          <span className="font-display text-[17px] leading-tight font-semibold text-fg">{currentLabel}</span>
        </div>
        {nextLabel ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <ArrowRight size={13} className="flex-none text-faint" aria-hidden />
            <span>
              {nextWord ? `${nextWord}: ` : ""}
              {nextLabel}
            </span>
          </div>
        ) : null}
        <div className="mt-3 flex gap-1" aria-hidden>
          {STAGES.map((s, i) => (
            <span key={s} className={cn("h-1.5 flex-1 rounded-full", i <= safeIdx ? "bg-accent" : "bg-surface-3")} />
          ))}
        </div>
      </div>

      {/* Desktop: full stepper */}
      <ol className="hidden sm:flex sm:items-start">
        {STAGES.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <li key={s} className="relative flex min-w-0 flex-1 flex-col items-center text-center" aria-current={active ? "step" : undefined}>
              {i > 0 ? <span className={cn("absolute top-3.5 right-1/2 left-[-50%] h-0.5", i <= currentIdx ? "bg-accent" : "bg-line")} aria-hidden /> : null}
              <span
                className={cn(
                  "relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold",
                  done && "border-accent bg-accent text-accent-fg",
                  active && "border-accent bg-surface text-accent ring-4 ring-accent-soft",
                  !done && !active && "border-line bg-surface text-faint"
                )}
              >
                {done ? <Check size={14} strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className={cn("mt-2 px-1 text-[11px] leading-tight lg:text-xs", active ? "font-semibold text-fg" : done ? "text-fg-2" : "text-muted")}>{labels[s] ?? s}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
