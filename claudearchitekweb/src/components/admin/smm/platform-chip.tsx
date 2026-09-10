/**
 * Platform chip / dot. Pure presentational (usable from server and client components).
 * Pass `meta` from PLATFORM_META on the server; falls back to a neutral look.
 * Status wording is localised by the caller through `statusLabel` (design system v2 tokens).
 */
import { cn } from "@/lib/utils";

export type PlatformMeta = { label: string; color: string; maxChars: number };
export type PlatformMetaMap = Record<string, PlatformMeta>;

const STATUS_CLS: Record<string, string> = {
  connected: "border-transparent bg-success-soft text-success",
  published: "border-transparent bg-success-soft text-success",
  dry_run: "border-transparent bg-warning-soft text-warning",
  bot_only: "border-transparent bg-warning-soft text-warning",
  simulated: "border-transparent bg-accent-soft text-accent-soft-fg",
  manual: "border-line bg-surface-2 text-fg-2",
  pending: "border-line bg-surface-2 text-fg-2",
  skipped: "border-line bg-surface-2 text-fg-2",
  not_connected: "border-line bg-surface-2 text-fg-2",
  failed: "border-transparent bg-danger-soft text-danger",
  error: "border-transparent bg-danger-soft text-danger",
};

export function PlatformDot({ platform, meta, className, muted }: { platform: string; meta?: PlatformMeta; className?: string; muted?: boolean }) {
  return <span title={meta?.label ?? platform} className={cn("inline-block h-2.5 w-2.5 flex-none rounded-full", muted && "opacity-30", className)} style={{ backgroundColor: meta?.color ?? "var(--faint)" }} />;
}

export function PlatformChip({
  platform,
  meta,
  status,
  statusLabel,
  title,
  className,
  size = "sm",
}: {
  platform: string;
  meta?: PlatformMeta;
  status?: string;
  statusLabel?: string;
  title?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1.5 rounded-full border border-line bg-surface font-medium text-fg", size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs", className)}>
      <PlatformDot platform={platform} meta={meta} />
      {meta?.label ?? platform}
      {status ? <span className={cn("ml-0.5 rounded-full border px-1.5 py-px text-[10px] font-semibold", STATUS_CLS[status] ?? STATUS_CLS.pending)}>{statusLabel ?? status.replace(/_/g, " ")}</span> : null}
    </span>
  );
}

/** Compact row of dots for table cells. Disabled variants are dimmed. */
export function PlatformDots({ variants, metaMap, offLabel = "off" }: { variants: { platform: string; enabled: boolean; status?: string }[]; metaMap: PlatformMetaMap; offLabel?: string }) {
  if (!variants.length) return <span className="text-xs text-faint">—</span>;
  return (
    <span className="inline-flex items-center gap-1">
      {variants.map((v) => (
        <span key={v.platform} className="inline-flex items-center gap-0.5" title={`${metaMap[v.platform]?.label ?? v.platform}${v.enabled ? "" : ` (${offLabel})`}${v.status ? ` · ${v.status}` : ""}`}>
          <PlatformDot platform={v.platform} meta={metaMap[v.platform]} muted={!v.enabled} />
          {v.status === "failed" ? <span className="text-[10px] text-danger">!</span> : null}
        </span>
      ))}
    </span>
  );
}
