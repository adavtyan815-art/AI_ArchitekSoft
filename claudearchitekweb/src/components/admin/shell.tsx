/**
 * Shared admin building blocks: page header, status badges, key/value rows, tabs, spec strips, panels.
 * Design system v3 "Atelier" — semantic tokens only, hairlines instead of boxes,
 * serif page titles, mono labels and numerals. See docs/14_DESIGN_SYSTEM.md §9.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions, crumbs }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; crumbs?: { label: string; href?: string }[] }) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:mb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {crumbs?.length ? (
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                {c.href ? (
                  <Link href={c.href} className="transition-colors hover:text-fg">
                    {c.label}
                  </Link>
                ) : (
                  <span className="truncate text-fg-2">{c.label}</span>
                )}
                {i < crumbs.length - 1 ? <span className="text-faint">/</span> : null}
              </span>
            ))}
          </div>
        ) : null}
        <h1 className="h-sub">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
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

/** Coloured status chip (square). Pass `label` to show a localised name instead of the raw value. */
export function StatusBadge({ value, label, className }: { value: string | null | undefined; label?: string; className?: string }) {
  if (!value) return null;
  return (
    <Badge tone={STATUS_TONES[value] ?? "neutral"} className={cn("whitespace-nowrap", className)}>
      {label ?? value.replace(/_/g, " ")}
    </Badge>
  );
}

export function KV({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("border-b border-line py-2.5 last:border-0", className)}>
      <div className="font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase">{label}</div>
      <div className="mt-1 text-[14px] break-words text-fg">{children ?? "—"}</div>
    </div>
  );
}

/** Horizontally scrollable underline tab strip (works on a 375px phone). */
export function Tabs({ items, current, base }: { items: { key: string; label: string; count?: number }[]; current: string; base: string }) {
  return (
    <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-5 border-b border-line">
        {items.map((t) => (
          <Link
            key={t.key}
            href={t.key ? `${base}?tab=${t.key}` : base}
            className={cn("-mb-px flex items-center gap-1.5 border-b-2 py-2.5 font-mono text-[12px] tracking-[0.02em] whitespace-nowrap transition-colors", current === t.key ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg")}
          >
            {t.label}
            {typeof t.count === "number" ? <span className="num text-[10.5px] text-faint">{t.count}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * Spec strip: a row of key figures separated by hairlines instead of a grid of cards.
 * Children are `StatCard` items; the 1px gap over a `bg-line` ground draws the rules.
 */
export function SpecStrip({ children, cols = 4, className }: { children: ReactNode; cols?: 3 | 4 | 5; className?: string }) {
  const grid = cols === 3 ? "sm:grid-cols-3" : cols === 5 ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-4";
  return (
    <div className={cn("grid grid-cols-2 gap-px border-y border-line bg-line", grid, className)}>{children}</div>
  );
}

/** One figure inside a `SpecStrip`: mono label, large tabular value, mono hint. */
export function StatCard({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "brand" | "success" | "warning" | "danger" }) {
  const toneCls = tone === "brand" ? "text-accent" : tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-fg";
  return (
    <div className="bg-bg px-3.5 py-3.5 sm:px-4">
      <div className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{label}</div>
      <div className={cn("mt-2 font-display text-[1.6rem] leading-none font-medium tracking-[-0.02em] tabular-nums sm:text-[1.85rem]", toneCls)}>{value}</div>
      {hint ? <div className="caption mt-2 leading-snug">{hint}</div> : null}
    </div>
  );
}

export function Panel({ title, actions, children, className, bodyClassName }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("card", className)}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5 sm:px-5">
          <h2 className="font-display text-[1.05rem] leading-tight font-medium tracking-[-0.01em] text-fg">{title}</h2>
          {actions}
        </header>
      ) : null}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Sticky bar that keeps the primary form action reachable on a phone. */
export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("sticky bottom-16 z-10 -mx-4 mt-2 flex flex-wrap items-center gap-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none lg:bottom-0", className)}>{children}</div>;
}

/** Filter bar: a plain row bounded by hairlines — no inset card. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-line py-2", className)}>{children}</div>;
}

/** Scrollable row of underline filter tabs with mono counts. */
export function PillTabs({ items, current }: { items: { key: string; label: string; href: string; count?: number }[]; current: string }) {
  return (
    <div className="-mx-1 flex-1 overflow-x-auto px-1">
      <div className="flex min-w-max items-center gap-4">
        {items.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={cn("inline-flex items-center gap-1.5 border-b-2 pt-1 pb-0.5 font-mono text-[12px] tracking-[0.02em] whitespace-nowrap transition-colors", current === t.key ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg")}
          >
            {t.label}
            {typeof t.count === "number" ? <span className={cn("num text-[10.5px]", current === t.key ? "text-accent" : "text-faint")}>{t.count}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
