"use client";

/**
 * Post editor: title / goal / language / schedule, the media strip, and one editable
 * variant per platform (with an AI rewrite box and a small preview). All mutations go
 * through the server actions in app/admin/actions/smm-actions.ts.
 * Mobile: a horizontal platform strip switches variants, the action bar sticks to the bottom.
 *
 * Two rules the lifecycle depends on:
 * - "Send for approval" and "Publish now" save the current form first, so what goes out is what is
 *   on screen (an AI rewrite that was not saved used to be dropped silently);
 * - actions that rewrite a publish history (approval, cancel) are not offered once something was sent.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus, Sparkles, Star, Wand2, X } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { PlatformChip, PlatformDot, type PlatformMeta, type PlatformMetaMap } from "@/components/admin/smm/platform-chip";
import { VariantPreview } from "@/components/admin/smm/post-preview";
import { ABOVE_TAB_BAR, useStickyBarSpace } from "@/components/admin/smm/bar-space";
import { fromYerevanInput, toYerevanInput } from "@/lib/tz";
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
  applySuggestedSlotAction,
} from "@/app/admin/actions/smm-actions";

export type EditorAsset = {
  id: string;
  name: string;
  kind: string;
  mime: string;
  projectId: string | null;
  thumbUrl: string;
  /** Full-size media URL (for video: the real, playable file; range-served by /media). Optional so
   * older callers that only pass a thumbnail keep compiling; the preview falls back to the thumb. */
  url?: string;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
};
type Lang = "hy" | "ru" | "en";
type Goal = "trust" | "sales_b2b" | "sales_b2c" | "showcase" | "education";
const GOALS: Goal[] = ["trust", "sales_b2b", "sales_b2c", "showcase", "education"];
const FORMATS = ["image", "carousel", "video", "reel", "short", "text"] as const;
/** Mirrors the server schema: a variant keeps at most 40 hashtags. */
const MAX_TAGS = 40;
/** Once anything has gone out (or is going out) the post's history is not rewritten any more. */
const SENT_STATUSES = ["published", "partially_published", "publishing"];

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
  cancelConfirm: string; publishConfirm: string; moreActions: string; unsaved: string;
  platformsWord: string; failedWord: string; overLimit: string; hashtagsCapped: string; captionLimitNote: string;
  lastNote: string; schedulePast: string; savingFirst: string; sendApprovalShort: string;
  fromInbox: string; suggestedSlot: string; useSuggestedSlot: string; slotApplied: string; slotGone: string; tz: string;
  // Platform-accurate preview (post-preview.tsx) and the media-strip reorder/cover controls.
  deviceMobile: string; deviceDesktop: string; noVideoAttached: string; safeZoneCaption: string; safeZoneUi: string;
  carouselPrev: string; carouselNext: string; moveLeft: string; moveRight: string; setCover: string; coverBadge: string;
};

/** Set only for a post the local drop folder prepared (posts.source = 'inbox'). */
export type InboxOrigin = { folder: string; suggestedSlot: string | null; suggestedLabel: string | null };

export type EditorActions = {
  save: string; working: string; sendApproval: string; approve: string; publishNow: string; publishing: string; cancel: string; duplicate: string; backToDraft: string; delete: string;
};

type PublishResult = { platform: string; status: string; url?: string; error?: string; note?: string };
type Tone = "ok" | "warn" | "error";

const TONE_CLS: Record<Tone, string> = {
  ok: "border-success/30 bg-success-soft text-success",
  warn: "border-warning/30 bg-warning-soft text-warning",
  error: "border-danger/30 bg-danger-soft text-danger",
};

const splitTags = (s: string) => s.split(/[\s,]+/).map((h) => h.trim()).filter(Boolean);

/** Characters a variant sends: text + call to action + hashtags, the way the adapters assemble them. */
function lengthOf(v: EditorVariant) {
  const tags = splitTags(v.hashtags);
  return v.text.length + (v.cta ? v.cta.length + 2 : 0) + (tags.length ? tags.join(" ").length + 2 : 0);
}

/** Effective character limit: media lowers it wherever the platform caps captions (Telegram: 1024). */
function limitOf(meta: PlatformMeta | undefined, hasMedia: boolean) {
  if (hasMedia && meta?.mediaCaptionMax) return meta.mediaCaptionMax;
  return meta?.maxChars ?? 2200;
}

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
  inbox = null,
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
  /** Legacy prop; the dictionary's own lower-case wording is preferred when present. */
  platformsWord?: string;
  brandName: string;
  inbox?: InboxOrigin | null;
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
  const [msg, setMsg] = useState<{ text: string; tone: Tone } | null>(null);
  const [results, setResults] = useState<PublishResult[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pending, start] = useTransition();
  const moreBtn = useRef<HTMLButtonElement>(null);
  useStickyBarSpace();

  const word = L.platformsWord || platformsWord || "";
  const nameOf = (platform: string) => metaMap[platform]?.label ?? platform;
  const hasMedia = attached.length > 0;
  const sent = SENT_STATUSES.includes(post.status);
  const canSendApproval = !sent && post.status !== "cancelled";
  // With every platform switched off there is nothing to publish, and publishNowAction would answer
  // "no platform is enabled". Offering the action anyway means asking the owner to confirm a click
  // that is guaranteed to fail — so the button goes away with the last enabled variant instead.
  const hasEnabledVariant = variants.some((v) => v.enabled);
  const canPublish = hasEnabledVariant && post.status !== "published" && post.status !== "publishing" && post.status !== "cancelled";
  const canCancel = !sent && post.status !== "cancelled";
  // Read from the clock, so it must not be part of the first render: the server HTML and the
  // hydrating client would disagree whenever a minute ticks over between the two.
  const [minSchedule, setMinSchedule] = useState("");
  useEffect(() => {
    setMinSchedule(toYerevanInput(new Date().toISOString()));
  }, []);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      moreBtn.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const patchVariant = (id: string, patch: Partial<EditorVariant>) => {
    setDirty(true);
    setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  /**
   * Media order is meaningful, not decorative: `attached[0]` is the cover shown in every preview and
   * is what `saveNow()` sends first in `assetIds`, so a carousel/image post publishes in this order.
   */
  const moveAsset = (index: number, delta: number) => {
    setDirty(true);
    setAttached((s) => {
      const to = index + delta;
      if (to < 0 || to >= s.length) return s;
      const next = s.slice();
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  };
  const makeCover = (index: number) => {
    if (index === 0) return;
    setDirty(true);
    setAttached((s) => {
      const next = s.slice();
      const [picked] = next.splice(index, 1);
      next.unshift(picked);
      return next;
    });
  };

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

  /**
   * Saves the form exactly as it is on screen. Returns the notes the operator must still see
   * (hashtags that had to be capped, variants over their platform limit) so the caller can add them
   * to its own message instead of flashing two banners.
   */
  async function saveNow(): Promise<{ ok: boolean; notes: string[] }> {
    const capped: string[] = [];
    const payload = variants.map((v) => {
      const tags = splitTags(v.hashtags);
      if (tags.length > MAX_TAGS) capped.push(nameOf(v.platform));
      return { id: v.id, enabled: v.enabled, title: v.title || null, text: v.text, hashtags: tags.slice(0, MAX_TAGS), cta: v.cta || null, format: v.format };
    });
    const r = await savePostAction({ id: post.id, title, notes: post.notes, goal, language, assetIds: attached.map((a) => a.id), variants: payload });
    if (!r.ok) {
      setMsg({ text: r.error, tone: "error" });
      return { ok: false, notes: [] };
    }
    setDirty(false);
    const over = variants.filter((v) => v.enabled && lengthOf(v) > limitOf(metaMap[v.platform], hasMedia)).map((v) => nameOf(v.platform));
    const notes: string[] = [];
    if (capped.length) notes.push(`${L.hashtagsCapped} ${capped.join(", ")}`);
    if (over.length) notes.push(`${L.overLimit} ${over.join(", ")}`);
    return { ok: true, notes };
  }

  const save = () =>
    run(async () => {
      const s = await saveNow();
      if (!s.ok) return;
      setMsg({ text: [L.saved, ...s.notes].join(" · "), tone: s.notes.length ? "warn" : "ok" });
    });

  const saveSchedule = () =>
    run(async () => {
      const iso = fromYerevanInput(schedule);
      if (schedule && (!iso || new Date(iso).getTime() < Date.now() - 60_000)) {
        setMsg({ text: L.schedulePast, tone: "error" });
        return;
      }
      const r = await schedulePostAction({ id: post.id, scheduledAt: iso });
      setMsg(r.ok ? { text: iso ? L.scheduledOk : L.scheduleCleared, tone: "ok" } : { text: r.error, tone: "error" });
    });

  const approval = () =>
    run(async () => {
      const s = await saveNow();
      if (!s.ok) return;
      const r = await sendApprovalAction({ id: post.id });
      // A dry run is a success here exactly as it is in the hub: the post is waiting for approval.
      setMsg(r.ok ? { text: [r.message, ...s.notes].join(" · "), tone: "ok" } : { text: r.error, tone: "error" });
    });

  /** One click from the inbox banner: writes the proposed slot onto the post and into the input. */
  const applySuggestedSlot = () =>
    run(async () => {
      const r = await applySuggestedSlotAction({ id: post.id });
      if (!r.ok) {
        setMsg({ text: r.error, tone: "error" });
        return;
      }
      setSchedule(r.scheduledLocal);
      setMsg({ text: `${L.slotApplied} ${r.scheduledLocal.replace("T", " ")}`, tone: "ok" });
    });

  const setStatus = (status: "approved" | "cancelled" | "draft" | "scheduled") =>
    run(async () => {
      const r = await setPostStatusAction({ id: post.id, status });
      setMsg(r.ok ? { text: `${L.statusSet} ${postStatusLabels[status] ?? status}`, tone: "ok" } : { text: r.error, tone: "error" });
    });

  const publish = () => {
    if (!canPublish) return; // the button is gone by then; this keeps a stale keyboard event honest
    if (!window.confirm(L.publishConfirm)) return;
    run(async () => {
      const s = await saveNow();
      if (!s.ok) return;
      const r = await publishNowAction({ id: post.id });
      if (!r.ok) {
        setMsg({ text: r.error, tone: "error" });
        return;
      }
      setResults(r.results);
      // The cards are seeded from props once, so the new per-variant state is applied here as well.
      setVariants((vs) => vs.map((v) => {
        const u = r.variants.find((x) => x.id === v.id);
        return u ? { ...v, status: u.status, externalUrl: u.externalUrl, error: u.error } : v;
      }));
      const failed = r.results.filter((x) => x.status === "failed").map((x) => nameOf(x.platform));
      const text = [`${postStatusLabels[r.status] ?? r.status} — ${r.results.length} ${word}`.trim(), failed.length ? `${L.failedWord} ${failed.join(", ")}` : "", ...s.notes].filter(Boolean).join(" · ");
      setMsg({ text, tone: r.status === "failed" ? "error" : failed.length || r.status === "partially_published" ? "warn" : "ok" });
    });
  };

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

  const cancelPost = () => {
    if (!window.confirm(L.cancelConfirm)) return;
    setStatus("cancelled");
  };

  function improve(v: EditorVariant, instruction: string) {
    if (!instruction.trim()) return;
    run(async () => {
      const r = await rewriteVariantAction({ instruction, text: v.text, language });
      if (!r.ok) {
        setMsg({ text: r.error, tone: "error" });
        return;
      }
      patchVariant(v.id, { text: r.text });
      const note = "note" in r ? (r.note as string) : undefined;
      setMsg({ text: note ?? (r.changed ? L.rewritten : L.sameText), tone: r.changed ? "ok" : "warn" });
    });
  }

  /** One menu item; every action closes the menu first so focus does not stay on a hidden button. */
  const item = (key: string, label: string, onClick: () => void, opts: { danger?: boolean; className?: string } = {}) => (
    <button
      key={key}
      type="button"
      role="menuitem"
      onClick={() => {
        setMenu(false);
        onClick();
      }}
      disabled={pending}
      className={cn("flex min-h-11 w-full items-center gap-2 px-3.5 text-left text-[13.5px] hover:bg-surface-2 disabled:opacity-50", opts.danger ? "text-danger" : "text-fg", opts.className)}
    >
      {label}
    </button>
  );

  const unattached = library.filter((a) => !attached.some((x) => x.id === a.id));
  const box = msg ? <div className={cn("rounded-sm border px-4 py-2.5 text-[13.5px]", TONE_CLS[msg.tone])}>{msg.text}</div> : null;

  return (
    <div className="min-w-0 space-y-5">
      {/* Persistent live regions: the wrappers stay mounted and only their content changes, so a
          polite (success / warning) or assertive (error) announcement fires every time. */}
      <div role="status" aria-live="polite">{msg && msg.tone !== "error" ? box : null}</div>
      <div role="alert">{msg && msg.tone === "error" ? box : null}</div>

      {/* Informational, not a warning: a plain surface with an accent rule, so the inbox banner does
          not compete with the red / green result banners a few pixels above it. */}
      {inbox ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-sm border border-line border-l-2 border-l-accent bg-surface-2 px-4 py-2.5 text-[13px] text-fg-2">
          <span>
            {L.fromInbox} <b className="font-semibold text-fg">{inbox.folder}</b>
          </span>
          {inbox.suggestedLabel ? (
            <span>
              <span aria-hidden className="text-faint">·</span> {L.suggestedSlot} <b className="num font-semibold text-fg">{inbox.suggestedLabel}</b>
            </span>
          ) : null}
          {inbox.suggestedSlot ? (
            <button type="button" onClick={applySuggestedSlot} disabled={pending} className="btn-secondary btn-sm ml-auto whitespace-nowrap">
              {L.useSuggestedSlot}
            </button>
          ) : null}
        </div>
      ) : null}

      <section className="card p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={L.internalTitle} required className="sm:col-span-2">
            <Input value={title} required onChange={(e) => { setTitle(e.target.value); setDirty(true); }} maxLength={120} />
          </Field>
          <Field label={L.goal}>
            <Select value={goal} onChange={(e) => { setGoal(e.target.value as Goal); setDirty(true); }}>
              {GOALS.map((g) => (
                <option key={g} value={g}>{goalLabels[g] ?? g}</option>
              ))}
            </Select>
          </Field>
          <Field label={L.language}>
            <Select value={language} onChange={(e) => { setLanguage(e.target.value as Lang); setDirty(true); }}>
              <option value="hy">Հայերեն</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </Select>
          </Field>
          <Field label={L.scheduled} hint={L.scheduledHint} className="sm:col-span-2">
            <div className="flex min-w-0 gap-2">
              <Input type="datetime-local" value={schedule} min={minSchedule} onChange={(e) => setSchedule(e.target.value)} className="min-w-0" />
              <button type="button" onClick={saveSchedule} disabled={pending} className="btn-secondary btn-sm whitespace-nowrap">{L.set}</button>
            </div>
          </Field>
        </div>
      </section>

      <section className="card">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h2 className="font-display text-[1.05rem] leading-tight font-medium tracking-[-0.01em] text-fg">
            {L.media} <span className="text-faint">({attached.length})</span>
          </h2>
          <button type="button" onClick={() => setShowPicker((s) => !s)} aria-expanded={showPicker} className="btn-secondary btn-sm">
            <Plus size={14} aria-hidden /> {showPicker ? L.close : L.addMedia}
          </button>
        </header>
        <div className="p-4 sm:p-5">
          {attached.length === 0 ? (
            <p className="text-sm text-muted">{L.noMedia}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
              {attached.map((a, i) => (
                <div key={a.id} className="group relative aspect-square overflow-hidden rounded-sm border border-line">
                  {a.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.thumbUrl} alt={a.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-surface-2 text-[10px] text-muted">{a.kind}</span>
                  )}
                  <span aria-hidden className={cn("absolute top-1 left-1 inline-flex h-4 min-w-4 items-center justify-center rounded bg-inverse-bg/80 px-1 text-[10px] font-semibold text-inverse-fg", i === 0 && "bg-accent text-inverse-fg")}>
                    {i === 0 ? <Star size={9} fill="currentColor" aria-hidden /> : i + 1}
                  </span>
                  {i === 0 ? <span className="sr-only">{L.coverBadge}</span> : null}
                  <button
                    type="button"
                    onClick={() => { setAttached((s) => s.filter((x) => x.id !== a.id)); setDirty(true); }}
                    title={`${L.remove}: ${a.name}`}
                    aria-label={`${L.remove}: ${a.name}`}
                    className="absolute top-1 right-1 inline-flex h-10 w-10 items-center justify-center rounded-sm bg-inverse-bg/80 text-inverse-fg hover:bg-danger sm:h-7 sm:w-7"
                  >
                    <X size={14} aria-hidden />
                  </button>
                  {/* Reorder + "set as cover": only meaningful once there is more than one file. */}
                  {attached.length > 1 ? (
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-inverse-bg/75 px-0.5 py-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => moveAsset(i, -1)}
                        disabled={i === 0}
                        title={L.moveLeft}
                        aria-label={L.moveLeft}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-inverse-fg hover:bg-inverse-fg/20 disabled:opacity-30 sm:h-6 sm:w-6"
                      >
                        <ChevronLeft size={13} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => makeCover(i)}
                        disabled={i === 0}
                        title={L.setCover}
                        aria-label={L.setCover}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-inverse-fg hover:bg-inverse-fg/20 disabled:opacity-30 sm:h-6 sm:w-6"
                      >
                        <Star size={13} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveAsset(i, 1)}
                        disabled={i === attached.length - 1}
                        title={L.moveRight}
                        aria-label={L.moveRight}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-inverse-fg hover:bg-inverse-fg/20 disabled:opacity-30 sm:h-6 sm:w-6"
                      >
                        <ChevronRight size={13} aria-hidden />
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {showPicker ? (
            <div className="mt-5 border-t border-line pt-4">
              <div className="mb-2.5 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
                {L.library} {unattached.length ? `(${unattached.length})` : ""}
              </div>
              {unattached.length === 0 ? (
                <p className="text-xs text-muted">{L.allAttached}</p>
              ) : (
                <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-8">
                  {unattached.map((a) => (
                    <button key={a.id} type="button" title={a.name} aria-label={`${L.addMedia}: ${a.name}`} onClick={() => { setAttached((s) => [...s, a]); setDirty(true); }} className="aspect-square overflow-hidden rounded-sm border border-line hover:border-fg">
                      {a.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
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
        <div className="-mx-1 flex gap-4 overflow-x-auto border-b border-line px-1 lg:hidden" role="tablist" aria-label={L.platformsTab}>
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={active === v.id}
              onClick={() => setActive(v.id)}
              className={cn("-mb-px inline-flex min-h-11 flex-none items-center gap-1.5 border-b-2 py-2.5 font-mono text-[12px] transition-colors", active === v.id ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg", !v.enabled && "opacity-50")}
            >
              <PlatformDot platform={v.platform} meta={metaMap[v.platform]} />
              {nameOf(v.platform)}
              {!v.enabled ? <span className="sr-only">({L.off})</span> : null}
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
            hasMedia={hasMedia}
            onChange={(patch) => patchVariant(v.id, patch)}
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
          <h2 className="mb-3 font-display text-[1.05rem] leading-tight font-medium tracking-[-0.01em] text-fg">{L.publishResult}</h2>
          <ul className="space-y-2 text-sm">
            {results.map((r) => (
              <li key={r.platform} className="flex flex-wrap items-center gap-2">
                <PlatformChip platform={r.platform} meta={metaMap[r.platform]} status={r.status} statusLabel={variantStatusLabels[r.status] ?? r.status} />
                {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="text-accent underline">{r.url}</a> : null}
                {r.error ? <span className={cn(r.status === "failed" ? "text-danger" : "text-muted")}>{r.error}</span> : null}
                {r.note ? <span className="text-muted">{r.note}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* One row on a phone: Save, the one approval step that applies, and everything else in a menu.
          Publishing is the loudest action, so it is a deliberate choice with a confirmation. */}
      <div
        className="glass pb-safe fixed inset-x-0 z-20 flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 lg:static lg:z-auto lg:rounded-md lg:border lg:border-line lg:bg-surface lg:px-3 lg:py-3"
        style={{ bottom: ABOVE_TAB_BAR }}
      >
        {/* btn-primary (ink), not btn-brand: the terracotta accent is reserved for "Generate post pack",
            the one action that costs an AI call. An ordinary Save must not shout louder than that. */}
        <button type="button" onClick={save} disabled={pending} className="btn-primary btn-sm">
          {pending ? A.working : A.save}
          {dirty ? <span aria-hidden> •</span> : null}
          {dirty ? <span className="sr-only">({L.unsaved})</span> : null}
        </button>
        {canSendApproval && post.status !== "awaiting_approval" ? (
          <button type="button" onClick={approval} disabled={pending} className="btn-secondary btn-sm">
            <span className="lg:hidden">{L.sendApprovalShort}</span>
            <span className="hidden lg:inline">{A.sendApproval}</span>
          </button>
        ) : null}
        {post.status === "awaiting_approval" ? <button type="button" onClick={() => setStatus("approved")} disabled={pending} className="btn-secondary btn-sm">{A.approve}</button> : null}
        {canPublish ? (
          <button type="button" onClick={publish} disabled={pending} className="btn-secondary btn-sm hidden lg:inline-flex">
            <Sparkles size={14} aria-hidden /> {pending ? A.publishing : A.publishNow}
          </button>
        ) : null}

        <div className="relative ml-auto">
          <button ref={moreBtn} type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label={L.moreActions} className="btn-ghost btn-sm">
            <MoreHorizontal size={16} aria-hidden />
            <span className="hidden sm:inline">{L.moreActions}</span>
          </button>
          {menu ? (
            <>
              <div aria-hidden className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
              <div role="menu" aria-label={L.moreActions} className="absolute right-0 bottom-full z-40 mb-2 w-60 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-lift">
                {/* Publishing stays in the bar on a wide screen; on a phone the bar keeps one row. */}
                {canPublish ? item("publish", A.publishNow, publish, { className: "lg:hidden" }) : null}
                {canSendApproval && post.status === "awaiting_approval" ? item("approval", A.sendApproval, approval) : null}
                {item("duplicate", A.duplicate, duplicate)}
                {canCancel ? item("cancel", A.cancel, cancelPost) : null}
                {post.status === "cancelled" ? item("draft", A.backToDraft, () => setStatus("draft")) : null}
                {item("delete", A.delete, remove, { danger: true })}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VariantCard({
  v,
  meta,
  attached,
  hasMedia,
  onChange,
  onImprove,
  pending,
  labels,
  variantStatusLabels,
  brandName,
  className,
}: {
  v: EditorVariant;
  meta?: PlatformMeta;
  attached: EditorAsset[];
  hasMedia: boolean;
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
  const max = limitOf(meta, hasMedia);
  const captionCapped = hasMedia && !!meta?.mediaCaptionMax && meta.mediaCaptionMax < (meta.maxChars ?? Infinity);
  const tags = splitTags(v.hashtags);
  const len = lengthOf(v);
  const over = len > max;
  // Only the platforms that actually publish a title get the field — and only they show one in the preview.
  const needsTitle = meta?.usesTitle ?? (v.platform === "youtube" || v.platform === "linkedin");
  // The preview is built from the SAME ordered media strip every variant publishes from — reordering
  // or picking a cover there (see moveAsset/makeCover in PostEditor) changes what every card shows.
  const toPreviewAsset = (a: EditorAsset) => ({ id: a.id, name: a.name, mime: a.mime, thumbUrl: a.thumbUrl, url: a.url || a.thumbUrl });
  const previewImages = attached.filter((a) => a.mime.startsWith("image/")).map(toPreviewAsset);
  const previewVideoAsset = attached.find((a) => a.mime.startsWith("video/"));
  const previewVideo = previewVideoAsset ? toPreviewAsset(previewVideoAsset) : undefined;
  const failed = v.status === "failed";

  return (
    <section className={cn("card", !v.enabled && "opacity-60", className)}>
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <PlatformChip platform={v.platform} meta={meta} size="md" status={v.status !== "pending" ? v.status : undefined} statusLabel={variantStatusLabels[v.status]} />
        <span className={cn("ml-auto text-[11px] font-medium tabular-nums", over ? "font-semibold text-danger" : "text-faint")}>{len} / {max}</span>
        <label className="flex min-h-11 items-center gap-2 text-xs text-fg-2">
          <input type="checkbox" checked={v.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} className="h-5 w-5 rounded-none border-line-strong accent-[var(--accent)]" />
          {L.enabled}
        </label>
        <Select value={v.format} onChange={(e) => onChange({ format: e.target.value as EditorVariant["format"] })} className="h-11 w-32 py-1 text-xs sm:h-9" aria-label={L.format}>
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
          {captionCapped ? <p className="text-xs text-muted">{L.captionLimitNote}</p> : null}
          <Field label={L.hashtags} hint={`${L.hashtagsHint} ${tags.length}/${MAX_TAGS}`}>
            <Input value={v.hashtags} onChange={(e) => onChange({ hashtags: e.target.value })} placeholder="#ArchiTekSoft #Furniture3D" />
          </Field>
          <Field label={L.cta}>
            <Input value={v.cta} onChange={(e) => onChange({ cta: e.target.value })} maxLength={300} />
          </Field>
          <div className="border-t border-line pt-4">
            <div className="mb-2.5 flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
              <Wand2 size={13} aria-hidden /> {L.improve}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder={L.improvePlaceholder} aria-label={L.improve} className="h-11 text-[13px] sm:h-9" maxLength={500} />
              <button type="button" disabled={pending || !instruction.trim()} onClick={() => onImprove(instruction)} className="btn-secondary btn-sm whitespace-nowrap">{L.rewrite}</button>
            </div>
          </div>
          {/* A simulated (dry-run) publish leaves a note in the same column as a real error: only a real
              failure is shown in the danger colour. */}
          {v.error ? <p className={cn("font-mono text-[11px]", failed ? "text-danger" : "text-muted")}>{failed ? L.lastPublish : L.lastNote} {v.error}</p> : null}
        </div>

        <div>
          <VariantPreview
            format={v.format}
            meta={meta}
            images={previewImages}
            video={previewVideo}
            needsTitle={needsTitle}
            title={v.title}
            text={v.text}
            cta={v.cta}
            tags={tags.length ? tags.slice(0, MAX_TAGS).join(" ") : ""}
            brandName={brandName}
            labels={L}
          />
        </div>
      </div>
    </section>
  );
}
