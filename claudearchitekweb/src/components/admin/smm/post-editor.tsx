"use client";

/**
 * Post editor: title / goal / language / schedule, the media strip, and one editable
 * variant per platform (with an AI rewrite box and a small preview). All mutations go
 * through the server actions in app/admin/actions/smm-actions.ts.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { PlatformChip, type PlatformMetaMap } from "@/components/admin/smm/platform-chip";
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

type PublishResult = { platform: string; status: string; url?: string; error?: string; note?: string };

export function PostEditor({
  post,
  variants: initialVariants,
  assets: initialAssets,
  library,
  metaMap,
}: {
  post: { id: string; title: string; goal: Goal; language: Lang; status: string; scheduledLocal: string; notes: string | null };
  variants: EditorVariant[];
  assets: EditorAsset[];
  library: EditorAsset[];
  metaMap: PlatformMetaMap;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(post.title);
  const [goal, setGoal] = useState<Goal>(post.goal);
  const [language, setLanguage] = useState<Lang>(post.language);
  const [schedule, setSchedule] = useState(post.scheduledLocal);
  const [variants, setVariants] = useState(initialVariants);
  const [attached, setAttached] = useState(initialAssets);
  const [showPicker, setShowPicker] = useState(false);
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
        setMsg({ text: m || "Something went wrong.", tone: "error" });
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
      setMsg(r.ok ? { text: "Saved.", tone: "ok" } : { text: r.error, tone: "error" });
    });

  const saveSchedule = () =>
    run(async () => {
      const iso = schedule ? new Date(`${schedule.length === 16 ? `${schedule}:00` : schedule}+04:00`).toISOString() : null;
      const r = await schedulePostAction({ id: post.id, scheduledAt: iso });
      setMsg(r.ok ? { text: iso ? "Scheduled." : "Schedule cleared — back to draft.", tone: "ok" } : { text: r.error, tone: "error" });
    });

  const approval = () =>
    run(async () => {
      const r = await sendApprovalAction({ id: post.id });
      setMsg(r.ok ? { text: r.message, tone: r.dryRun ? "error" : "ok" } : { text: r.error, tone: "error" });
    });

  const setStatus = (status: "approved" | "cancelled" | "draft" | "scheduled") =>
    run(async () => {
      const r = await setPostStatusAction({ id: post.id, status });
      setMsg(r.ok ? { text: `Status: ${status}.`, tone: "ok" } : { text: r.error, tone: "error" });
    });

  const publish = () =>
    run(async () => {
      const r = await publishNowAction({ id: post.id });
      if (!r.ok) {
        setMsg({ text: r.error, tone: "error" });
        return;
      }
      setResults(r.results);
      setMsg({ text: `${r.status.replace("_", " ")} — ${r.results.length} platform(s).`, tone: r.status === "failed" ? "error" : "ok" });
    });

  const duplicate = () =>
    run(async () => {
      const r = await duplicatePostAction({ id: post.id });
      if (r.ok) router.push(`/admin/smm/${r.id}`);
      else setMsg({ text: r.error, tone: "error" });
    });

  const remove = () => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
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
      setMsg({ text: note ?? (r.changed ? `Rewritten with ${r.provider}. Review and save.` : "The model returned the same text."), tone: r.changed ? "ok" : "error" });
    });
  }

  const unattached = library.filter((a) => !attached.some((x) => x.id === a.id));

  return (
    <div className="space-y-5">
      {msg ? (
        <div className={cn("rounded-xl border px-4 py-3 text-sm", msg.tone === "error" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-green-200 bg-green-50 text-green-800")}>{msg.text}</div>
      ) : null}

      <section className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Internal title" className="sm:col-span-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </Field>
          <Field label="Goal">
            <Select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
              {GOALS.map((g) => (
                <option key={g} value={g}>{g.replace("_", " ")}</option>
              ))}
            </Select>
          </Field>
          <Field label="Language">
            <Select value={language} onChange={(e) => setLanguage(e.target.value as Lang)}>
              <option value="hy">Հայերեն</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </Select>
          </Field>
          <Field label="Scheduled (Asia/Yerevan)" hint="Empty = draft. The worker sends the Telegram approval ahead of this time.">
            <div className="flex gap-2">
              <Input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
              <button type="button" onClick={saveSchedule} disabled={pending} className="btn-secondary btn-sm whitespace-nowrap">Set</button>
            </div>
          </Field>
        </div>
      </section>

      <section className="card">
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-ink-900">Media <span className="text-ink-400">({attached.length})</span></h2>
          <button type="button" onClick={() => setShowPicker((s) => !s)} className="btn-secondary btn-sm">
            <Plus size={14} /> {showPicker ? "Close" : "Add media"}
          </button>
        </header>
        <div className="p-5">
          {attached.length === 0 ? (
            <p className="text-sm text-ink-500">No media attached — the post will be published as text only.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attached.map((a, i) => (
                <div key={a.id} className="relative h-24 w-24 overflow-hidden rounded-lg border border-line">
                  {a.thumbUrl ? <img src={a.thumbUrl} alt={a.name} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-ink-100 text-[10px] text-ink-500">{a.kind}</span>}
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">{i + 1}{a.kind === "poster" ? " poster" : ""}</span>
                  <button type="button" onClick={() => setAttached((s) => s.filter((x) => x.id !== a.id))} title="Remove" className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {showPicker ? (
            <div className="mt-4 rounded-xl border border-line bg-ink-50/60 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Library {unattached.length ? `(${unattached.length})` : ""}</div>
              {unattached.length === 0 ? (
                <p className="text-xs text-ink-500">Everything available is already attached.</p>
              ) : (
                <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-8">
                  {unattached.map((a) => (
                    <button key={a.id} type="button" title={a.name} onClick={() => setAttached((s) => [...s, a])} className="aspect-square overflow-hidden rounded-lg border border-line hover:border-brand-500">
                      {a.thumbUrl ? <img src={a.thumbUrl} alt={a.name} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-ink-100 text-[10px] text-ink-500">{a.kind}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
          <p className="mt-3 text-xs text-ink-500">Media changes are stored when you press <b>Save</b>.</p>
        </div>
      </section>

      <div className="space-y-4">
        {variants.map((v) => (
          <VariantCard key={v.id} v={v} meta={metaMap[v.platform]} attached={attached} onChange={(patch) => dirtyVariant(v.id, patch)} onImprove={(instr) => improve(v, instr)} pending={pending} />
        ))}
      </div>

      {results ? (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Publish result</h2>
          <ul className="space-y-2 text-sm">
            {results.map((r) => (
              <li key={r.platform} className="flex flex-wrap items-center gap-2">
                <PlatformChip platform={r.platform} meta={metaMap[r.platform]} status={r.status} />
                {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="text-brand-600 underline">{r.url}</a> : null}
                {r.error ? <span className="text-red-700">{r.error}</span> : null}
                {r.note ? <span className="text-ink-500">{r.note}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur">
        <button type="button" onClick={save} disabled={pending} className="btn-primary btn-sm">{pending ? "Working…" : "Save"}</button>
        <button type="button" onClick={approval} disabled={pending} className="btn-secondary btn-sm">Send to Telegram for approval</button>
        {post.status === "awaiting_approval" ? <button type="button" onClick={() => setStatus("approved")} disabled={pending} className="btn-secondary btn-sm">Approve</button> : null}
        <button type="button" onClick={publish} disabled={pending} className="btn-brand btn-sm"><Sparkles size={14} /> Publish now</button>
        <button type="button" onClick={duplicate} disabled={pending} className="btn-ghost btn-sm">Duplicate</button>
        {post.status !== "cancelled" ? <button type="button" onClick={() => setStatus("cancelled")} disabled={pending} className="btn-ghost btn-sm">Cancel</button> : <button type="button" onClick={() => setStatus("draft")} disabled={pending} className="btn-ghost btn-sm">Back to draft</button>}
        <button type="button" onClick={remove} disabled={pending} className="btn-ghost btn-sm ml-auto text-red-700 hover:bg-red-50"><Trash2 size={14} /> Delete</button>
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
}: {
  v: EditorVariant;
  meta?: { label: string; color: string; maxChars: number };
  attached: EditorAsset[];
  onChange: (patch: Partial<EditorVariant>) => void;
  onImprove: (instruction: string) => void;
  pending: boolean;
}) {
  const [instruction, setInstruction] = useState("");
  const max = meta?.maxChars ?? 2200;
  const tags = v.hashtags.split(/[\s,]+/).filter(Boolean);
  const len = v.text.length + (v.cta ? v.cta.length + 2 : 0) + (tags.length ? tags.join(" ").length + 2 : 0);
  const over = len > max;
  const needsTitle = v.platform === "youtube" || v.platform === "linkedin";
  const cover = attached[0];

  return (
    <section className={cn("card", !v.enabled && "opacity-60")}>
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <PlatformChip platform={v.platform} meta={meta} size="md" status={v.status !== "pending" ? v.status : undefined} />
        <label className="ml-auto flex items-center gap-2 text-xs text-ink-600">
          <input type="checkbox" checked={v.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} className="h-4 w-4 rounded border-ink-300" />
          Enabled
        </label>
        <Select value={v.format} onChange={(e) => onChange({ format: e.target.value as EditorVariant["format"] })} className="w-32 py-1 text-xs">
          {FORMATS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </Select>
      </header>
      <div className="grid gap-5 p-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          {needsTitle ? (
            <Field label={v.platform === "youtube" ? "Video title" : "Headline (first line)"}>
              <Input value={v.title} onChange={(e) => onChange({ title: e.target.value })} maxLength={200} />
            </Field>
          ) : null}
          <label className="block">
            <span className="label flex items-center justify-between">
              Text
              <span className={cn("text-[11px] font-normal", over ? "font-semibold text-red-600" : "text-ink-400")}>{len} / {max}</span>
            </span>
            <Textarea value={v.text} onChange={(e) => onChange({ text: e.target.value })} className="min-h-[180px] font-normal" />
          </label>
          <Field label="Hashtags" hint="Space or comma separated.">
            <Input value={v.hashtags} onChange={(e) => onChange({ hashtags: e.target.value })} placeholder="#KitchenPro #ArchiTekSoft" />
          </Field>
          <Field label="Call to action">
            <Input value={v.cta} onChange={(e) => onChange({ cta: e.target.value })} maxLength={300} />
          </Field>
          <div className="rounded-xl border border-line bg-ink-50/60 p-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500"><Wand2 size={13} /> Improve with AI</div>
            <div className="flex gap-2">
              <Input value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="shorter / more formal / mention the 3D link" className="py-1.5 text-xs" maxLength={500} />
              <button type="button" disabled={pending || !instruction.trim()} onClick={() => onImprove(instruction)} className="btn-secondary btn-sm whitespace-nowrap">Rewrite</button>
            </div>
          </div>
          {v.error ? <p className="text-xs text-red-700">Last publish: {v.error}</p> : null}
        </div>

        <div className="rounded-xl border border-line bg-white p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Preview</div>
          <div className="overflow-hidden rounded-lg border border-line">
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <span className="h-6 w-6 rounded-full" style={{ backgroundColor: meta?.color ?? "#9ca3af" }} />
              <span className="text-xs font-semibold text-ink-900">ArchiTek Soft</span>
              <span className="ml-auto text-[10px] text-ink-400">{meta?.label ?? v.platform}</span>
            </div>
            {cover?.thumbUrl ? <img src={cover.thumbUrl} alt="" className="max-h-56 w-full object-cover" /> : null}
            <div className="space-y-2 px-3 py-2 text-xs text-ink-800">
              {v.title ? <p className="font-semibold text-ink-950">{v.title}</p> : null}
              <p className="whitespace-pre-wrap">{v.text.slice(0, 600) || "…"}</p>
              {v.cta ? <p className="font-medium text-ink-900">{v.cta}</p> : null}
              {tags.length ? <p className="text-brand-600">{tags.join(" ")}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
