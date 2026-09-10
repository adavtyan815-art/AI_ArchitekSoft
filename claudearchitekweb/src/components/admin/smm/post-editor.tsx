"use client";

/**
 * Post editor: title / goal / language / schedule, the media strip, and one editable
 * variant per platform (with an AI rewrite box and a small preview). All mutations go
 * through the server actions in app/admin/actions/smm-actions.ts.
 * Mobile: a horizontal platform strip switches variants, the action bar sticks to the bottom.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { PlatformChip, PlatformDot, type PlatformMetaMap } from "@/components/admin/smm/platform-chip";
import { cn } from "@/lib/utils";
import {
  deletePostAction,
  duplicatePostAction,
  publishNowAction,
  rewriteVariantAction,
  savePostAction,
  schedulePostAction,
  sendApprovalAction,
  setPostStatusAction,
} from "@/app/admin/actions/smm-actions";

export type EditorAsset = { id: string; name: string; kind: string; mime: string; projectId: string | null; thumbUrl: string };
type Lang = "hy" | "ru" | "en";
type Goal = "trust" | "sales_b2b" | "sales_b2c" | "showcase" | "education";
const GOALS: Goal[] = ["trust", "sales_b2b", "sales_b2c", "showcase", "education"];
const FORMATS = ["image", "carousel", "video", "reel", "short", "text"] as const;

export type EditorVariant = {
  id: string;
  platform: string;
  enabled: boolean;
  title: string;
  text: string;
  hashtags: string;
  cta: string;
  format: (typeof FORMATS)[number];
  status: string;
  externalUrl: string | null;
  error: string | null;
};

export type EditorLabels = {
  internalTitle: string; goal: string; language: string; scheduled: string; scheduledHint: string; set: string;
  media: string; addMedia: string; close: string; noMedia: string; library: string; allAttached: string; mediaSaveNote: string; remove: string;
  enabled: string; format: string; formats: Record<string, string>;
  videoTitle: string; headline: string; text: string; hashtags: string; hashtagsHint: string; cta: string;
  improve: string; improvePlaceholder: string; rewrite: string; preview: string; lastPublish: string; publishResult: string;
  saved: string; scheduledOk: string; scheduleCleared: string; sameText: string; rewritten: string; statusSet: string; genericError: string; deleteConfirm: string;
  platformsTab: string; off: string;
};

export type EditorActions = {
  save: string; working: string; sendApproval: string; approve: string; publishNow: string; publishing: string; cancel: string; duplicate: string; backToDraft: string; delete: string;
};

type PublishResult = { platform: string; status: string; url?: string; error?: string; note?: string };

export function PostEditor({
  post,
  variants: initialVariants,
  assets: initialAssets,
  library,
  metaMap,
  labels,
  actionLabels,
  goalLabels,
  variantStatusLabels,
  postStatusLabels,
  platformsWord,
  brandName,
}: {
  post: { id: string; title: string; goal: Goal; language: Lang; status: string; scheduledLocal: string; notes: string | null };
  variants: EditorVariant[];
  assets: EditorAsset[];
  library: EditorAsset[];
  metaMap: PlatformMetaMap;
  labels: EditorLabels;
  actionLabels: EditorActions;
  goalLabels: Record<string, string>;
  variantStatusLabels: Record<string, string>;
  postStatusLabels: Record<string, string>;
  platformsWord: string;
  brandName: string;
}) {
  const L = labels;
  const A = actionLabels;
  const router = useRouter();
  const [title, setTitle] = useState(post.title);
  const [goal, setGoal] = useState<Goal>(post.goal);
  const [language, setLanguage] = useState<Lang>(post.language);
  const [schedule, setSchedule] = useState(post.scheduledLocal);
  const [variants, setVariants] = useState(initialVariants);
  const [attached, setAttached] = useState(initialAssets);
  const [showPicker, setShowPicker] = useState(false);
  const [active, setActive] = useState(initialVariants[0]?.id ?? "");
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const [results, setResults] = useState<PublishResult[] | null>(null);
  const [pending, start] = useTransition();

  const dirtyVariant = (id: string, patch: Partial<EditorVariant>) => setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  function run(fn: () => Promise<void>) {
    setMsg(null);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        const m = (e as Error).message ?? "";
        if (/NEXT_REDIRECT/.test(m)) throw e;
        setMsg({ text: m || L.genericError, tone: "error" });
      }
    });
  }

  const save = () =>
    run(async () => {
      const r = await savePostAction({
        id: post.id,
        title,
        notes: post.notes,
        goal,
        language,
        assetIds: attached.map((a) => a.id),
        variants: variants.map((v) => ({
          id: v.id,
          enabled: v.enabled,
          title: v.title || null,
          text: v.text,
          hashtags: v.hashtags.split(/[\s,]+/).map((h) => h.trim()).filter(Boolean).slice(0, 40),
          cta: v.cta || null,
          format: v.format,
        })),
      });
      setMsg(r.ok ? { text: L.saved, tone: "ok" } : { text: r.error, tone: "error" });
    });

  const saveSchedule = () =>
    run(async () => {
      const iso = schedule ? new Date(`${schedule.length === 16 ? `${schedule}:00` : schedule}+04:00`).toISOString() : null;
      const r = await schedulePostAction({ id: post.id, scheduledAt: iso });
      setMsg(r.ok ? { text: iso ? L.scheduledOk : L.scheduleCleared, tone: "ok" } : { text: r.error, tone: "error" });
    });

  const approval = () =>
    run(async () => {
      const r = await sendApprovalAction({ id: post.id });
      setMsg(r.ok ? { text: r.message, tone: r.dryRun ? "error" : "ok" } : { text: r.error, tone: "error" });
    });

  const setStatus = (status: "approved" | "cancelled" | "draft" | "scheduled") =>
    run(async () => {
      const r = await setPostStatusAction({ id: post.id, status });
      setMsg(r.ok ? { text: `${L.statusSet} ${postStatusLabels[status] ?? status}`, tone: "ok" } : { text: r.error, tone: "error" });
    });

  const publish = () =>
    run(async () => {
      const r = await publishNowAction({ id: post.id });
      if (!r.ok) {
        setMsg({ text: r.error, tone: "error" });
        return;
      }
      setResults(r.results);
      setMsg({ text: `${postStatusLabels[r.status] ?? r.status} — ${r.results.length} ${platformsWord}`, tone: r.status === "failed" ? "error" : "ok" });
    });

  const duplicate = () =>
    run(async () => {
      const r = await duplicatePostAction({ id: post.id });
      if (r.ok) router.push(`/admin/smm/${r.id}`);
      else setMsg({ text: r.error, tone: "error" });
    });

  const remove = () => {
    if (!window.confirm(L.deleteConfirm)) return;
    run(async () => {
      await deletePostAction({ id: post.id });
    });
  };

  function improve(v: EditorVariant, instruction: string) {
    if (!instruction.trim()) return;
    run(async () => {
      const r = await rewriteVariantAction({ instruction, text: v.text, language });
      if (!r.ok) {
        setMsg({ text: r.error, tone: "error" });
        return;
      }
      dirtyVariant(v.id, { text: r.text });
      const note = "note" in r ? (r.note as string) : undefined;
      setMsg({ text: note ?? (r.changed ? L.rewritten : L.sameText), tone: r.changed ? "ok" : "error" });
    });
  }

  const unattached = library.filter((a) => !attached.some((x) => x.id === a.id));

  return (
    <div className="min-w-0 space-y-5 pb-24 lg:pb-0">
      {msg ? (
        <div className={cn("rounded-xl border px-4 py-3 text-sm", msg.tone === "error" ? "border-warning/30 bg-warning-soft text-warning" : "border-success/30 bg-success-soft text-success")}>{msg.text}</div>
      ) : null}

      <section className="card p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={L.internalTitle} className="sm:col-span-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </Field>
          <Field label={L.goal}>
            <Select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
              {GOALS.map((g) => (
                <option key={g} value={g}>{goalLabels[g] ?? g}</option>
              ))}
            </Select>
          </Field>
          <Field label={L.language}>
            <Select value={language} onChange={(e) => setLanguage(e.target.value as Lang)}>
              <option value="hy">Հայերեն</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </Select>
          </Field>
          <Field label={L.scheduled} hint={L.scheduledHint} className="sm:col-span-2">
            <div className="flex min-w-0 gap-2">
              <Input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} className="min-w-0" />
              <button type="button" onClick={saveSchedule} disabled={pending} className="btn-secondary btn-sm whitespace-nowrap">{L.set}</button>
            </div>
          </Field>
        </div>
      </section>

      <section className="card">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-fg">
            {L.media} <span className="text-faint">({attached.length})</span>
          </h2>
          <button type="button" onClick={() => setShowPicker((s) => !s)} className="btn-secondary btn-sm">
            <Plus size={14} /> {showPicker ? L.close : L.addMedia}
          </button>
        </header>
        <div className="p-4 sm:p-5">
          {attached.length === 0 ? (
            <p className="text-sm text-muted">{L.noMedia}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
              {attached.map((a, i) => (
                <div key={a.id} className="relative aspect-square overflow-hidden rounded-xl border border-line">
                  {a.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.thumbUrl} alt={a.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-surface-2 text-[10px] text-muted">{a.kind}</span>
                  )}
                  <span className="absolute top-1 left-1 rounded bg-inverse-bg/80 px-1 text-[10px] font-semibold text-inverse-fg">{i + 1}</span>
                  <button type="button" onClick={() => setAttached((s) => s.filter((x) => x.id !== a.id))} title={L.remove} aria-label={L.remove} className="absolute top-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-inverse-bg/80 text-inverse-fg hover:bg-danger">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {showPicker ? (
            <div className="card-inset mt-4 p-3">
              <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
                {L.library} {unattached.length ? `(${unattached.length})` : ""}
              </div>
              {unattached.length === 0 ? (
                <p className="text-xs text-muted">{L.allAttached}</p>
              ) : (
                <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-8">
                  {unattached.map((a) => (
                    <button key={a.id} type="button" title={a.name} onClick={() => setAttached((s) => [...s, a])} className="aspect-square overflow-hidden rounded-lg border border-line hover:border-accent">
                      {a.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.thumbUrl} alt={a.name} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-surface-2 text-[10px] text-muted">{a.kind}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
          <p className="mt-3 text-xs text-muted">{L.mediaSaveNote}</p>
        </div>
      </section>

      {/* Platform strip — mobile only */}
      {variants.length > 1 ? (
        <div className="card-inset -mx-1 flex gap-1.5 overflow-x-auto p-1.5 lg:hidden" role="tablist" aria-label={L.platformsTab}>
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={active === v.id}
              onClick={() => setActive(v.id)}
              className={cn("inline-flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors", active === v.id ? "bg-fg text-bg" : "text-fg-2 hover:bg-surface-3", !v.enabled && "opacity-50")}
            >
              <PlatformDot platform={v.platform} meta={metaMap[v.platform]} />
              {metaMap[v.platform]?.label ?? v.platform}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        {variants.map((v) => (
          <VariantCard
            key={v.id}
            v={v}
            meta={metaMap[v.platform]}
            attached={attached}
            onChange={(patch) => dirtyVariant(v.id, patch)}
            onImprove={(instr) => improve(v, instr)}
            pending={pending}
            labels={L}
            variantStatusLabels={variantStatusLabels}
            brandName={brandName}
            className={cn(variants.length > 1 && active !== v.id && "hidden lg:block")}
          />
        ))}
      </div>

      {results ? (
        <section className="card p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-fg">{L.publishResult}</h2>
          <ul className="space-y-2 text-sm">
            {results.map((r) => (
              <li key={r.platform} className="flex flex-wrap items-center gap-2">
                <PlatformChip platform={r.platform} meta={metaMap[r.platform]} status={r.status} statusLabel={variantStatusLabels[r.status] ?? r.status} />
                {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="text-accent underline">{r.url}</a> : null}
                {r.error ? <span className="text-danger">{r.error}</span> : null}
                {r.note ? <span className="text-muted">{r.note}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="glass pb-safe fixed inset-x-0 bottom-[68px] z-20 flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 lg:static lg:z-auto lg:rounded-xl lg:border lg:border-line lg:bg-surface lg:px-3 lg:py-3 lg:shadow-card">
        <button type="button" onClick={save} disabled={pending} className="btn-brand btn-sm">{pending ? A.working : A.save}</button>
        <button type="button" onClick={approval} disabled={pending} className="btn-secondary btn-sm">{A.sendApproval}</button>
        {post.status === "awaiting_approval" ? <button type="button" onClick={() => setStatus("approved")} disabled={pending} className="btn-secondary btn-sm">{A.approve}</button> : null}
        <button type="button" onClick={publish} disabled={pending} className="btn-primary btn-sm">
          <Sparkles size={14} /> {pending ? A.publishing : A.publishNow}
        </button>
        <button type="button" onClick={duplicate} disabled={pending} className="btn-ghost btn-sm hidden sm:inline-flex">{A.duplicate}</button>
        {post.status !== "cancelled" ? (
          <button type="button" onClick={() => setStatus("cancelled")} disabled={pending} className="btn-ghost btn-sm hidden sm:inline-flex">{A.cancel}</button>
        ) : (
          <button type="button" onClick={() => setStatus("draft")} disabled={pending} className="btn-ghost btn-sm hidden sm:inline-flex">{A.backToDraft}</button>
        )}
        <button type="button" onClick={remove} disabled={pending} className="btn-ghost btn-sm ml-auto text-danger hover:bg-danger-soft" aria-label={A.delete}>
          <Trash2 size={14} /> <span className="hidden sm:inline">{A.delete}</span>
        </button>
      </div>
    </div>
  );
}

function VariantCard({
  v,
  meta,
  attached,
  onChange,
  onImprove,
  pending,
  labels,
  variantStatusLabels,
  brandName,
  className,
}: {
  v: EditorVariant;
  meta?: { label: string; color: string; maxChars: number };
  attached: EditorAsset[];
  onChange: (patch: Partial<EditorVariant>) => void;
  onImprove: (instruction: string) => void;
  pending: boolean;
  labels: EditorLabels;
  variantStatusLabels: Record<string, string>;
  brandName: string;
  className?: string;
}) {
  const L = labels;
  const [instruction, setInstruction] = useState("");
  const max = meta?.maxChars ?? 2200;
  const tags = v.hashtags.split(/[\s,]+/).filter(Boolean);
  const len = v.text.length + (v.cta ? v.cta.length + 2 : 0) + (tags.length ? tags.join(" ").length + 2 : 0);
  const over = len > max;
  const needsTitle = v.platform === "youtube" || v.platform === "linkedin";
  const cover = attached[0];

  return (
    <section className={cn("card", !v.enabled && "opacity-60", className)}>
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <PlatformChip platform={v.platform} meta={meta} size="md" status={v.status !== "pending" ? v.status : undefined} statusLabel={variantStatusLabels[v.status]} />
        <span className={cn("ml-auto text-[11px] font-medium tabular-nums", over ? "font-semibold text-danger" : "text-faint")}>{len} / {max}</span>
        <label className="flex items-center gap-2 text-xs text-fg-2">
          <input type="checkbox" checked={v.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} className="h-4 w-4 rounded border-line-strong accent-[var(--accent)]" />
          {L.enabled}
        </label>
        <Select value={v.format} onChange={(e) => onChange({ format: e.target.value as EditorVariant["format"] })} className="w-32 py-1 text-xs" aria-label={L.format}>
          {FORMATS.map((f) => (
            <option key={f} value={f}>{L.formats[f] ?? f}</option>
          ))}
        </Select>
      </header>
      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          {needsTitle ? (
            <Field label={v.platform === "youtube" ? L.videoTitle : L.headline}>
              <Input value={v.title} onChange={(e) => onChange({ title: e.target.value })} maxLength={200} />
            </Field>
          ) : null}
          <label className="block">
            <span className="label flex items-center justify-between">
              {L.text}
              <span className={cn("text-[11px] font-normal tabular-nums", over ? "font-semibold text-danger" : "text-faint")}>{len} / {max}</span>
            </span>
            <Textarea value={v.text} onChange={(e) => onChange({ text: e.target.value })} className="min-h-[180px] font-normal" />
          </label>
          <Field label={L.hashtags} hint={L.hashtagsHint}>
            <Input value={v.hashtags} onChange={(e) => onChange({ hashtags: e.target.value })} placeholder="#KitchenPro #ArchiTekSoft" />
          </Field>
          <Field label={L.cta}>
            <Input value={v.cta} onChange={(e) => onChange({ cta: e.target.value })} maxLength={300} />
          </Field>
          <div className="card-inset p-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
              <Wand2 size={13} /> {L.improve}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder={L.improvePlaceholder} className="py-1.5 text-xs" maxLength={500} />
              <button type="button" disabled={pending || !instruction.trim()} onClick={() => onImprove(instruction)} className="btn-secondary btn-sm whitespace-nowrap">{L.rewrite}</button>
            </div>
          </div>
          {v.error ? <p className="text-xs text-danger">{L.lastPublish} {v.error}</p> : null}
        </div>

        <div className="card-inset p-3">
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{L.preview}</div>
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <span className="h-6 w-6 rounded-full" style={{ backgroundColor: meta?.color ?? "var(--faint)" }} />
              <span className="text-xs font-semibold text-fg">{brandName}</span>
              <span className="ml-auto text-[10px] text-faint">{meta?.label ?? v.platform}</span>
            </div>
            {cover?.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.thumbUrl} alt="" loading="lazy" className="max-h-56 w-full object-cover" />
            ) : null}
            <div className="space-y-2 px-3 py-2 text-xs text-fg-2">
              {v.title ? <p className="font-semibold text-fg">{v.title}</p> : null}
              <p className="whitespace-pre-wrap">{v.text.slice(0, 600) || "…"}</p>
              {v.cta ? <p className="font-medium text-fg">{v.cta}</p> : null}
              {tags.length ? <p className="text-accent">{tags.join(" ")}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
