/**
 * Platform chip / dot. Pure presentational (usable from server and client components).
 * Pass `meta` from PLATFORM_META on the server; falls back to a neutral look.
 * Status wording is localised by the caller through `statusLabel` (design system v2 tokens).
 *
 * Accessibility: colour alone never carries meaning. The dot is decorative (aria-hidden) and every
 * chip/dot row spells its platform, its off state and its status out for screen readers.
 */
import { cn } from "@/lib/utils";

export type PlatformMeta = {
  label: string;
  color: string;
  maxChars: number;
  /** The platform publishes a separate title/headline field (YouTube, LinkedIn). */
  usesTitle?: boolean;
  /** Lower character limit that applies when media is attached (Telegram captions). */
  mediaCaptionMax?: number;
};
export type PlatformMetaMap = Record<string, PlatformMeta>;

const STATUS_CLS: Record<string, string> = {
  connected: "border-transparent bg-success-soft text-success",
  published: "border-transparent bg-success-soft text-success",
  dry_run: "border-transparent bg-warning-soft text-warning",
  bot_only: "border-transparent bg-warning-soft text-warning",
  // A simulated publish is a success, not an error: it must not share the danger palette (it used to
  // read as a red chip next to a real failure).
  simulated: "border-line-strong bg-surface-2 text-fg-2",
  manual: "border-line bg-surface-2 text-fg-2",
  pending: "border-line bg-surface-2 text-fg-2",
  skipped: "border-line bg-surface-2 text-fg-2",
  not_connected: "border-line bg-surface-2 text-fg-2",
  failed: "border-transparent bg-danger-soft text-danger",
  error: "border-transparent bg-danger-soft text-danger",
};

/** Human wording for a raw status key when the caller passes no label. */
const pretty = (s: string) => s.replace(/_/g, " ");

export function PlatformDot({ platform, meta, className, muted }: { platform: string; meta?: PlatformMeta; className?: string; muted?: boolean }) {
  return (
    <span
      aria-hidden
      title={meta?.label ?? platform}
      className={cn("inline-block h-2 w-2 flex-none rounded-[1px]", muted && "opacity-30", className)}
      style={{ backgroundColor: meta?.color ?? "var(--faint)" }}
    />
  );
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
    <span title={title} className={cn("inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface font-mono tracking-[0.04em] text-fg", size === "sm" ? "px-1.5 py-0.5 text-[10.5px]" : "px-2 py-1 text-[11.5px]", className)}>
      <PlatformDot platform={platform} meta={meta} />
      {meta?.label ?? platform}
      {status ? <span className={cn("ml-0.5 rounded-[2px] border px-1.5 py-px text-[9.5px] tracking-[0.06em] uppercase", STATUS_CLS[status] ?? STATUS_CLS.pending)}>{statusLabel ?? pretty(status)}</span> : null}
    </span>
  );
}

/**
 * Compact row of dots for table cells. Disabled variants are dimmed *and* named: the visible dots are
 * decorative, the sr-only sentence carries platform, off state and the localised status.
 * `statusLabels` maps a raw variant status to its wording (pass `t.variantStatus`).
 */
export function PlatformDots({
  variants,
  metaMap,
  offLabel = "off",
  statusLabels,
}: {
  variants: { platform: string; enabled: boolean; status?: string }[];
  metaMap: PlatformMetaMap;
  offLabel?: string;
  statusLabels?: Record<string, string>;
}) {
  if (!variants.length) return <span className="text-xs text-faint">—</span>;
  const describe = (v: { platform: string; enabled: boolean; status?: string }) => {
    const name = metaMap[v.platform]?.label ?? v.platform;
    const status = v.status ? (statusLabels?.[v.status] ?? pretty(v.status)) : "";
    return `${name}${v.enabled ? "" : ` (${offLabel})`}${status ? ` · ${status}` : ""}`;
  };
  return (
    <span className="inline-flex items-center gap-1">
      {variants.map((v) => (
        <span key={v.platform} className="inline-flex items-center gap-0.5" title={describe(v)}>
          <PlatformDot platform={v.platform} meta={metaMap[v.platform]} muted={!v.enabled} />
          <span className="sr-only">{describe(v)}</span>
          {v.status === "failed" ? <span aria-hidden className="text-[10px] text-danger">!</span> : null}
        </span>
      ))}
    </span>
  );
}
