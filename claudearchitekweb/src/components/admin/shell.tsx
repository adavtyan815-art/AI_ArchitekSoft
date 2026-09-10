/**
 * Shared admin building blocks: page header, status badges, key/value rows, tabs, stat cards, panels.
 * Design system v2 — semantic tokens only (bg / surface / line / fg / muted / accent).
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions, crumbs }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; crumbs?: { label: string; href?: string }[] }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {crumbs?.length ? (
          <div className="mb-1.5 flex flex-wrap items-center gap-1 text-xs text-muted">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {c.href ? (
                  <Link href={c.href} className="transition-colors hover:text-fg">
                    {c.label}
                  </Link>
                ) : (
                  <span className="truncate">{c.label}</span>
                )}
                {i < crumbs.length - 1 ? <ChevronRight size={12} className="text-faint" /> : null}
              </span>
            ))}
          </div>
        ) : null}
        <h1 className="font-display text-[1.6rem] leading-tight font-bold tracking-tight text-fg sm:text-[1.9rem]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const STATUS_TONES: Record<string, "neutral" | "brand" | "success" | "warning" | "danger" | "dark"> = {
  new: "brand", contacted: "warning", qualified: "brand", proposal: "warning", won: "success", lost: "danger",
  active: "success", on_hold: "warning", done: "dark", cancelled: "danger", prospect: "brand", partner: "success", inactive: "neutral", vip: "dark", lead: "brand",
  request: "brand", survey: "brand", design: "warning", configuration: "warning", approval: "warning", production_prep: "brand", production: "brand", installation: "brand", handover: "success", archived: "neutral",
  draft: "neutral", scheduled: "brand", awaiting_approval: "warning", approved: "success", publishing: "warning", published: "success", partially_published: "warning", failed: "danger",
  pending: "neutral", simulated: "brand", skipped: "neutral", connected: "success", dry_run: "warning", bot_only: "warning", manual: "neutral", not_connected: "neutral", error: "danger",
  b2b: "dark", b2c: "brand",
};

/** Coloured status chip. Pass `label` to show a localised name instead of the raw value. */
export function StatusBadge({ value, label, className }: { value: string | null | undefined; label?: string; className?: string }) {
  if (!value) return null;
  return (
    <Badge tone={STATUS_TONES[value] ?? "neutral"} className={className}>
      {label ?? value.replace(/_/g, " ")}
    </Badge>
  );
}

export function KV({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("border-b border-line py-2 last:border-0", className)}>
      <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-0.5 text-sm break-words text-fg">{children ?? "—"}</div>
    </div>
  );
}

/** Horizontally scrollable tab strip (works on a 375px phone). */
export function Tabs({ items, current, base }: { items: { key: string; label: string; count?: number }[]; current: string; base: string }) {
  return (
    <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-1 border-b border-line">
        {items.map((t) => (
          <Link
            key={t.key}
            href={t.key ? `${base}?tab=${t.key}` : base}
            className={cn("-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors", current === t.key ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg")}
          >
            {t.label}
            {typeof t.count === "number" ? <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg-2">{t.count}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "brand" | "success" | "warning" | "danger" }) {
  const toneCls = tone === "brand" ? "text-accent" : tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-fg";
  return (
    <div className="card p-4">
      <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</div>
      <div className={cn("mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums", toneCls)}>{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export function Panel({ title, actions, children, className, bodyClassName }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("card", className)}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          {actions}
        </header>
      ) : null}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Sticky bar that keeps the primary form action reachable on a phone. */
export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("sticky bottom-16 z-10 -mx-4 mt-1 flex flex-wrap items-center gap-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none lg:bottom-0", className)}>{children}</div>;
}

/** Filter bar wrapper: a soft inset card that holds pills, selects and the search box. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card-inset mb-4 flex flex-wrap items-center gap-2 p-2.5", className)}>{children}</div>;
}

/** Scrollable row of filter pills. */
export function PillTabs({ items, current }: { items: { key: string; label: string; href: string; count?: number }[]; current: string }) {
  return (
    <div className="-mx-1 flex-1 overflow-x-auto px-1">
      <div className="flex min-w-max gap-1.5">
        {items.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors", current === t.key ? "bg-fg text-bg" : "bg-surface text-fg-2 hover:bg-surface-3")}
          >
            {t.label}
            {typeof t.count === "number" ? <span className={cn("text-[11px] font-medium", current === t.key ? "opacity-70" : "text-muted")}>{t.count}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
