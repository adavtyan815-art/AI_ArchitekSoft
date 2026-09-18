import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = ["request", "survey", "design", "configuration", "approval", "production_prep", "production", "installation", "handover"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Project-stage ruler (server component). "archived" is never shown.
 * A hairline with a tick per stage: passed ticks are ink, the current one is accent
 * and taller. Labels appear from sm upwards; phones get the current + next stage.
 */
export function StageStepper({ current, labels, statusLabel, nextWord }: { current: string; labels: Record<string, string>; statusLabel?: string; nextWord?: string }) {
  const idx = STAGES.indexOf(current as (typeof STAGES)[number]);
  const currentIdx = current === "archived" ? STAGES.length - 1 : idx;
  const safeIdx = Math.max(currentIdx, 0);
  const currentLabel = labels[current] ?? current;
  const nextStage = STAGES[safeIdx + 1];
  const nextLabel = nextStage ? (labels[nextStage] ?? nextStage) : null;
  const progress = ((safeIdx + 0.5) / STAGES.length) * 100;

  return (
    <div role="group" aria-label={statusLabel}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="kicker">{statusLabel}</span>
        <span className="caption tabular-nums">
          <span className="text-accent">{pad(safeIdx + 1)}</span>
          <span className="mx-1.5 text-faint">/</span>
          {pad(STAGES.length)}
        </span>
      </div>

      {/* The ruler */}
      <div className="relative mt-3 h-px w-full bg-line-strong" aria-hidden>
        <span className="absolute inset-y-0 left-0 block bg-accent" style={{ width: `${progress}%` }} />
      </div>
      <ol className="grid grid-cols-9">
        {STAGES.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          // Nine names at once forced a 10.5px type size and wrapped the long ones.
          // Only the stage the client is on and its two neighbours are drawn; the rest
          // stay in the accessibility tree, so the ruler still reads as a full list.
          const near = Math.abs(i - safeIdx) <= 1;
          return (
            <li key={s} className="flex min-w-0 flex-col items-center" aria-current={active ? "step" : undefined}>
              <span aria-hidden className={cn("w-px", active ? "h-5 bg-accent" : done ? "h-3.5 bg-fg" : "h-2.5 bg-line-strong")} />
              <span className={cn("mt-2 font-mono text-[11px] leading-none tabular-nums", active ? "text-accent" : done ? "text-fg" : "text-faint")}>{pad(i + 1)}</span>
              <span
                className={cn(
                  "sr-only",
                  near && "sm:not-sr-only sm:mt-2 sm:block sm:px-1 sm:text-center sm:text-[11.5px] sm:leading-tight",
                  active ? "font-semibold text-fg" : done ? "text-fg-2" : "text-muted",
                )}
              >
                {labels[s] ?? s}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Phones: the ruler carries no labels, so name the current and the next stage. */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:hidden">
        <span className="font-display text-[1.15rem] leading-tight text-fg">{currentLabel}</span>
        {nextLabel ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
            <ArrowRight size={12} className="flex-none text-faint" aria-hidden />
            {nextWord ? `${nextWord}: ` : ""}
            {nextLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
