/**
 * Platform chip / dot. Pure presentational (usable from server and client components).
 * Pass `meta` from PLATFORM_META on the server; falls back to a neutral look.
 */
import { cn } from "@/lib/utils";

export type PlatformMeta = { label: string; color: string; maxChars: number };
export type PlatformMetaMap = Record<string, PlatformMeta>;

const STATUS_LABEL: Record<string, string> = {
  connected: "connected",
  dry_run: "dry-run",
  bot_only: "bot only",
  manual: "manual",
  not_connected: "not connected",
  error: "error",
  published: "published",
  simulated: "simulated",
  failed: "failed",
  pending: "pending",
  skipped: "skipped",
};

const STATUS_CLS: Record<string, string> = {
  connected: "bg-green-50 text-green-700 border-green-200",
  published: "bg-green-50 text-green-700 border-green-200",
  dry_run: "bg-amber-50 text-amber-700 border-amber-200",
  bot_only: "bg-amber-50 text-amber-700 border-amber-200",
  simulated: "bg-brand-50 text-brand-700 border-brand-200",
  manual: "bg-ink-50 text-ink-600 border-ink-200",
  pending: "bg-ink-50 text-ink-600 border-ink-200",
  skipped: "bg-ink-50 text-ink-600 border-ink-200",
  not_connected: "bg-ink-50 text-ink-600 border-ink-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  error: "bg-red-50 text-red-700 border-red-200",
};

export function PlatformDot({ platform, meta, className, muted }: { platform: string; meta?: PlatformMeta; className?: string; muted?: boolean }) {
  return <span title={meta?.label ?? platform} className={cn("inline-block h-2.5 w-2.5 flex-none rounded-full", muted && "opacity-30", className)} style={{ backgroundColor: meta?.color ?? "#9ca3af" }} />;
}

export function PlatformChip({ platform, meta, status, title, className, size = "sm" }: { platform: string; meta?: PlatformMeta; status?: string; title?: string; className?: string; size?: "sm" | "md" }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white font-medium text-ink-800", size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs", className)}>
      <PlatformDot platform={platform} meta={meta} />
      {meta?.label ?? platform}
      {status ? <span className={cn("ml-0.5 rounded-full border px-1.5 py-px text-[10px] font-semibold", STATUS_CLS[status] ?? STATUS_CLS.pending)}>{STATUS_LABEL[status] ?? status.replace(/_/g, " ")}</span> : null}
    </span>
  );
}

/** Compact row of dots for table cells. Disabled variants are dimmed. */
export function PlatformDots({ variants, metaMap }: { variants: { platform: string; enabled: boolean; status?: string }[]; metaMap: PlatformMetaMap }) {
  if (!variants.length) return <span className="text-xs text-ink-400">—</span>;
  return (
    <span className="inline-flex items-center gap-1">
      {variants.map((v) => (
        <span key={v.platform} className="inline-flex items-center gap-0.5" title={`${metaMap[v.platform]?.label ?? v.platform}${v.enabled ? "" : " (off)"}${v.status ? ` · ${v.status}` : ""}`}>
          <PlatformDot platform={v.platform} meta={metaMap[v.platform]} muted={!v.enabled} />
          {v.status === "failed" ? <span className="text-[10px] text-red-600">!</span> : null}
        </span>
      ))}
    </span>
  );
}
