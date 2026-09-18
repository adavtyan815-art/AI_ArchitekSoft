/**
 * Shared admin building blocks: page header, status badges, key/value rows, tabs, spec strips, panels.
 * Design system v3 "Atelier" — semantic tokens only, hairlines instead of boxes,
 * serif page titles, mono labels and numerals. See docs/14_DESIGN_SYSTEM.md §9.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { ScrollStrip } from "@/components/admin/scroll-strip";
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
                  /* 40px tap target on a phone: the crumb is the back link on every detail page. */
                  <Link href={c.href} className="inline-flex min-h-10 items-center transition-colors hover:text-fg sm:min-h-0">
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
        {/* Titles can be user content (a file caption, a project name): a long unbroken string
            must wrap instead of widening the page on a phone. */}
        <h1 className="h-sub [overflow-wrap:anywhere]">{title}</h1>
        {/* Detail pages bake a relative time into this line ("created 2 min ago"), which is read from
            the clock on every render pass. Suppressing the warning here keeps a clock tick between the
            two dev render passes from being reported as a hydration mismatch; everything else in a
            subtitle is plain server-rendered data that cannot differ. */}
        {subtitle ? <p suppressHydrationWarning className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
    </div>
  );
}

const STATUS_TONES: Record<string, "neutral" | "brand" | "success" | "warning" | "danger" | "dark"> = {
  new: "brand", contacted: "warning", qualified: "brand", proposal: "warning", won: "success", lost: "danger",
  active: "success", on_hold: "warning", done: "dark", cancelled: "danger", prospect: "brand", partner: "success", inactive: "neutral", vip: "dark", lead: "brand",
  request: "brand", survey: "brand", design: "warning", configuration: "warning", approval: "warning", production_prep: "brand", production: "brand", installation: "brand", handover: "success", archived: "neutral",
  draft: "neutral", scheduled: "brand", awaiting_approval: "warning", approved: "success", sending_approval: "warning", publishing: "warning", published: "success", partially_published: "warning", failed: "danger",
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

/**
 * Horizontally scrollable underline tab strip (works on a 375px phone).
 * `ScrollStrip` brings the current tab into view on mount — on a phone the Settings tabs are
 * wider than the screen, so without it the active tab can sit entirely off-screen.
 */
export function Tabs({ items, current, base }: { items: { key: string; label: string; count?: number }[]; current: string; base: string }) {
  return (
    <ScrollStrip className="-mx-4 mb-5 px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-5 border-b border-line">
        {items.map((t) => (
          <Link
            key={t.key}
            href={t.key ? `${base}?tab=${t.key}` : base}
            aria-current={current === t.key ? "page" : undefined}
            className={cn("-mb-px flex min-h-10 items-center gap-1.5 border-b-2 py-2.5 font-mono text-[12px] tracking-[0.02em] whitespace-nowrap transition-colors", current === t.key ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg")}
          >
            {t.label}
            {typeof t.count === "number" ? <span className="num text-[10.5px] text-faint">{t.count}</span> : null}
          </Link>
        ))}
      </div>
    </ScrollStrip>
  );
}

/**
 * Spec strip: a row of key figures separated by hairlines instead of a grid of cards.
 * Children are `StatCard` items; the 1px gap over a `bg-line` ground draws the rules.
 */
export function SpecStrip({ children, cols = 4, className }: { children: ReactNode; cols?: 3 | 4 | 5; className?: string }) {
  const grid = cols === 3 ? "sm:grid-cols-3" : cols === 5 ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-4";
  // The hairlines are the 1px gaps over the `bg-line` ground, so an empty cell shows up as a
  // solid grey block the size of a figure. With an odd number of cards the last one spans the
  // gap instead: on phones (2 columns) always, and at sm for a 5-card strip in 3 columns.
  const fill = cn(
    "max-sm:[&>*:last-child:nth-child(odd)]:col-span-2",
    cols === 5 && "sm:max-lg:[&>*:last-child:nth-child(3n+2)]:col-span-2"
  );
  return (
    <div className={cn("grid grid-cols-2 gap-px border-y border-line bg-line", grid, fill, className)}>{children}</div>
  );
}

/**
 * One figure inside a `SpecStrip`: mono label, large tabular value, mono hint.
 * Pass `href` to make the whole figure a link to the list it counts.
 */
export function StatCard({ label, value, hint, tone, href }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "brand" | "success" | "warning" | "danger"; href?: string }) {
  const toneCls = tone === "brand" ? "text-accent" : tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-fg";
  const body = (
    <>
      <div className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{label}</div>
      <div className={cn("mt-2 font-display text-[1.6rem] leading-none font-medium tracking-[-0.02em] tabular-nums sm:text-[1.85rem]", toneCls)}>{value}</div>
      {hint ? <div className="caption mt-2 leading-snug">{hint}</div> : null}
    </>
  );
  const cell = "bg-bg px-3.5 py-3.5 sm:px-4";
  if (href) {
    return (
      <Link href={href} className={cn(cell, "block transition-colors hover:bg-surface-2 focus-visible:bg-surface-2")}>
        {body}
      </Link>
    );
  }
  return <div className={cell}>{body}</div>;
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

/**
 * Phone list: one record per row instead of the `.table-responsive` key/value dump.
 *
 * Below `md` a responsive table turns every column into its own labelled line, so a single record
 * costs six to nine lines and a six-item list runs several screens. A list is scanned, not read:
 * the row shows the name, one mono line of context (code · segment · updated) and one status chip,
 * and the whole row — 56px tall — opens the record.
 *
 * Pair it with the table it replaces: render `<CompactList>` for phones and keep the real
 * `<table className="table-admin">` inside a `max-md:hidden` wrapper for md and up.
 */
export function CompactList({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn("border-y border-line md:hidden", className)}>{children}</ul>;
}

/**
 * One row of a `CompactList`. `title` is the record's name, `meta` the mono context line and
 * `badge` the single status chip on the right. Everything truncates: a 120-character name without
 * spaces must not widen a 390px page.
 */
export function CompactRow({ href, title, meta, badge, className }: { href?: string; title: ReactNode; meta?: ReactNode; badge?: ReactNode; className?: string }) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-fg">{title}</span>
        {meta ? <span className="mt-0.5 block truncate font-mono text-[11px] tracking-[0.04em] text-muted">{meta}</span> : null}
      </span>
      {badge ? <span className="flex-none">{badge}</span> : null}
    </>
  );
  const cell = cn("flex min-h-14 w-full items-center gap-3 py-2.5 text-left", className);
  return (
    <li className="border-b border-line last:border-0">
      {href ? (
        <Link href={href} className={cn(cell, "transition-colors hover:bg-surface-2 focus-visible:bg-surface-2")}>
          {body}
        </Link>
      ) : (
        <div className={cell}>{body}</div>
      )}
    </li>
  );
}

/**
 * Scrollable row of underline filter tabs with mono counts.
 *
 * `w-full` is what keeps a phone page 390px wide: `FilterBar` is a wrapping flex container and
 * several pages turn it into a column (`flex-col items-stretch`). In a wrapping column the line
 * takes the widest item's max-content width, so without a definite width the strip is sized to
 * its content (1183px on Projects) and the page itself scrolls sideways, pushing the fixed
 * bottom tab bar off screen.
 */
export function PillTabs({ items, current }: { items: { key: string; label: string; href: string; count?: number }[]; current: string }) {
  return (
    <ScrollStrip className="w-full flex-1">
      <div className="flex min-w-max items-center gap-4">
        {items.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={current === t.key ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 border-b-2 font-mono text-[12px] tracking-[0.02em] whitespace-nowrap transition-colors sm:min-h-0 sm:pt-1 sm:pb-0.5",
              current === t.key ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg"
            )}
          >
            {t.label}
            {typeof t.count === "number" ? <span className={cn("num text-[10.5px]", current === t.key ? "text-accent" : "text-faint")}>{t.count}</span> : null}
          </Link>
        ))}
      </div>
    </ScrollStrip>
  );
}
