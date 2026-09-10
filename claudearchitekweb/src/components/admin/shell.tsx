/**
 * Shared admin building blocks: page header, status badges, key/value rows, tabs.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions, crumbs }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; crumbs?: { label: string; href?: string }[] }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {crumbs?.length ? (
          <div className="mb-1 flex items-center gap-1 text-xs text-ink-500">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {c.href ? <Link href={c.href} className="hover:text-ink-900">{c.label}</Link> : <span>{c.label}</span>}
                {i < crumbs.length - 1 ? <ChevronRight size={12} /> : null}
              </span>
            ))}
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-500">{subtitle}</p> : null}
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

export function StatusBadge({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value) return null;
  return (
    <Badge tone={STATUS_TONES[value] ?? "neutral"} className={className}>
      {value.replace(/_/g, " ")}
    </Badge>
  );
}

export function KV({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("py-2", className)}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-0.5 text-sm text-ink-900">{children ?? "—"}</div>
    </div>
  );
}

export function Tabs({ items, current, base }: { items: { key: string; label: string; count?: number }[]; current: string; base: string }) {
  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
      {items.map((t) => (
        <Link key={t.key} href={t.key ? `${base}?tab=${t.key}` : base} className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", current === t.key ? "border-ink-950 text-ink-950" : "border-transparent text-ink-500 hover:text-ink-900")}>
          {t.label}
          {typeof t.count === "number" ? <span className="ml-1.5 rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600">{t.count}</span> : null}
        </Link>
      ))}
    </div>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "brand" | "success" | "warning" | "danger" }) {
  const toneCls = tone === "brand" ? "text-brand-600" : tone === "success" ? "text-success-500" : tone === "warning" ? "text-amber-600" : tone === "danger" ? "text-danger-500" : "text-ink-950";
  return (
    <div className="card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold tracking-tight", toneCls)}>{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-ink-500">{hint}</div> : null}
    </div>
  );
}

export function Panel({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("card", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          {actions}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}
