"use client";

/**
 * Four-step post composer: project → media (+ branded poster) → goal/language/platforms → generate.
 * All data and every visible string come from the server page; the two server actions do the work.
 *
 * Selection rules that keep the generated post honest:
 * - at most 20 media files (the server refuses more), and the cap is explained instead of failing late;
 * - the selection is pruned when the project changes, so nothing invisible is attached;
 * - posters are never offered as the source of another poster (it doubles the brand mark).
 */
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ImagePlus, Sparkles, Video } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { PlatformChip, type PlatformMetaMap } from "@/components/admin/smm/platform-chip";
import { ABOVE_TAB_BAR, useStickyBarSpace } from "@/components/admin/smm/bar-space";
import { fromYerevanInput, toYerevanInput } from "@/lib/tz";
import { cn } from "@/lib/utils";
import { createPostAction, generatePosterAction } from "@/app/admin/actions/smm-actions";

export type ComposerAsset = {
  id: string;
  name: string;
  kind: string;
  mime: string;
  projectId: string | null;
  thumbUrl: string;
  durationSec: number | null;
};

export type ComposerProject = { id: string; code: string; title: string; type: string; segment: string; coverUrl: string };

type Goal = "trust" | "sales_b2b" | "sales_b2c" | "showcase" | "education";
const GOALS: Goal[] = ["trust", "sales_b2b", "sales_b2c", "showcase", "education"];

const LANGS: { key: "hy" | "ru" | "en"; label: string }[] = [
  { key: "hy", label: "Հայերեն" },
  { key: "ru", label: "Русский" },
  { key: "en", label: "English" },
];

const RATIOS = ["1:1", "4:5", "16:9", "9:16"] as const;
/** Mirrors the server schema (smm-actions CreateSchema): a post carries at most 20 files. */
const MAX_MEDIA = 20;

export type ComposerLabels = {
  step1: string; step1Hint: string; noProject: string; noProjectHint: string;
  step2: string; step2Hint: string; noMedia: string; noMediaAll: string; mediaLink: string; videoTag: string; posterTag: string;
  poster: string; posterSource: string; posterHeadline: string; posterMake: string; posterRendering: string; posterPickFirst: string; posterDone: string;
  step3: string; step3Hint: string; goalHints: Record<string, string>;
  language: string; schedule: string; scheduleHint: string; platforms: string;
  extra: string; extraHint: string; extraPlaceholder: string;
  step4: string; step4Hint: string; generate: string; generating: string; generateNote: string;
  pickPlatform: string; failed: string; summary: string; copywriter: string; templateNote: string; aiNote: string;
  sumProject: string; sumMedia: string; sumGoal: string; sumLanguage: string; sumPlatforms: string;
  mediaMax: string; selectionCleared: string; posterRatio: string; posterSourceHint: string;
  youtubeNeedsVideo: string; youtubeConfirm: string; noDefaultPlatforms: string; schedulePrefilled: string; schedulePast: string;
};

/**
 * A value read from the clock cannot be produced during render: this component is server-rendered
 * first and hydrated a moment later, and when a minute ticks over in between the two `min` attributes
 * differ — React reports that as a hydration mismatch it "won't patch up". So the value is empty on
 * the first render and filled in after mount. The server refuses a past schedule anyway, so the
 * field is never unguarded, only unconstrained for the first paint.
 */
function useNowInput(): string {
  const [now, setNow] = useState("");
  useEffect(() => {
    setNow(toYerevanInput(new Date().toISOString()));
  }, []);
  return now;
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <header className="flex items-baseline gap-3 border-b border-line px-4 py-2.5 sm:px-5">
        <span className="index flex-none">{String(n).padStart(2, "0")}</span>
        <div>
          <h2 className="font-display text-[1.05rem] leading-tight font-medium tracking-[-0.01em] text-fg">{title}</h2>
          {hint ? <p className="caption mt-0.5">{hint}</p> : null}
        </div>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function Composer({
  projects,
  assets: initialAssets,
  metaMap,
  platforms,
  defaults,
  ai,
  labels,
  goalLabels,
}: {
  projects: ComposerProject[];
  assets: ComposerAsset[];
  metaMap: PlatformMetaMap;
  platforms: string[];
  /**
   * `scheduledAtIso` is the next Settings → Social media posting slot, computed on the SERVER
   * (nextPostingSlot() in @/lib/smm). It arrives as a fixed ISO string so the pre-filled field renders
   * identically on the server and on the client; computing it here would be a hydration mismatch.
   */
  defaults: { platforms: string[]; language: "hy" | "ru" | "en"; scheduledAtIso?: string | null };
  ai: { provider: string; model: string };
  labels: ComposerLabels;
  goalLabels: Record<string, string>;
}) {
  const L = labels;
  const [assets, setAssets] = useState(initialAssets);
  const [projectId, setProjectId] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);
  const [goal, setGoal] = useState<Goal>("showcase");
  const [language, setLanguage] = useState<"hy" | "ru" | "en">(defaults.language);
  const noDefaultPlatforms = defaults.platforms.length === 0;
  const [chosen, setChosen] = useState<string[]>(noDefaultPlatforms ? ["facebook", "instagram"] : defaults.platforms);
  const [extra, setExtra] = useState("");
  const prefilled = useMemo(() => (defaults.scheduledAtIso ? toYerevanInput(defaults.scheduledAtIso) : ""), [defaults.scheduledAtIso]);
  const [scheduledAt, setScheduledAt] = useState(prefilled);
  const [posterSource, setPosterSource] = useState("");
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>("4:5");
  const [headline, setHeadline] = useState("");
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [posterMsg, setPosterMsg] = useState("");
  const [pending, start] = useTransition();
  const [posterPending, startPoster] = useTransition();
  // The composer's bar is only fixed below `sm`; from there the Generate button sits in step 4.
  useStickyBarSpace("(min-width: 640px)");

  const ofProject = (id: string) => (id ? assets.filter((a) => a.projectId === id) : assets);
  const visible = useMemo(() => (projectId ? assets.filter((a) => a.projectId === projectId) : assets).slice(0, 120), [assets, projectId]);
  const images = visible.filter((a) => a.mime.startsWith("image/"));
  // A poster already carries the brand mark and a headline, so it can never be a poster source.
  const sources = images.filter((a) => a.kind !== "poster");
  const project = projects.find((p) => p.id === projectId) ?? null;
  const hasVideo = selected.some((id) => assets.find((a) => a.id === id)?.mime.startsWith("video/"));
  const youtubeNoVideo = chosen.includes("youtube") && !hasVideo;
  const minSchedule = useNowInput();
  const full = selected.length >= MAX_MEDIA;

  /** Switching project hides other media, so anything invisible leaves the selection with it. */
  function chooseProject(id: string) {
    if (id === projectId) return;
    const allowed = new Set(ofProject(id).map((a) => a.id));
    const next = selected.filter((x) => allowed.has(x));
    setHint(next.length === selected.length ? "" : L.selectionCleared);
    setSelected(next);
    setProjectId(id);
  }

  function toggle(id: string) {
    if (selected.includes(id)) {
      setHint("");
      setSelected((s) => s.filter((x) => x !== id));
      return;
    }
    if (selected.length >= MAX_MEDIA) {
      setHint(L.mediaMax);
      return;
    }
    setHint("");
    setSelected((s) => [...s, id]);
  }

  function togglePlatform(p: string) {
    setChosen((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  }

  function makePoster() {
    const src = posterSource || sources.find((a) => selected.includes(a.id))?.id || sources[0]?.id || "";
    if (!src) {
      setPosterMsg(L.posterPickFirst);
      return;
    }
    setPosterMsg("");
    startPoster(async () => {
      try {
        const r = await generatePosterAction({ sourceAssetId: src, ratio, headline: headline || undefined, projectId: projectId || null });
        if (!r.ok) {
          setPosterMsg(r.error);
          return;
        }
        const a = r.asset;
        setAssets((prev) => [{ id: a.id, name: a.name, kind: a.kind, mime: a.mime, projectId: a.projectId, thumbUrl: a.thumbUrl, durationSec: a.durationSec }, ...prev]);
        setSelected((s) => (s.length >= MAX_MEDIA || s.includes(a.id) ? s : [...s, a.id]));
        setPosterMsg(`${L.posterDone} (${ratio})`);
      } catch (e) {
        console.error("[composer] poster failed", e);
        setPosterMsg(L.failed);
      }
    });
  }

  function generate() {
    setError("");
    if (chosen.length === 0) {
      setError(L.pickPlatform);
      return;
    }
    const iso = scheduledAt ? fromYerevanInput(scheduledAt) : null;
    if (scheduledAt && (!iso || new Date(iso).getTime() < Date.now() - 60_000)) {
      setError(L.schedulePast);
      return;
    }
    // YouTube always needs a video file; publishing an image-only post there fails on every platform run.
    if (youtubeNoVideo && !window.confirm(L.youtubeConfirm)) return;
    start(async () => {
      try {
        const r = await createPostAction({
          projectId: projectId || null,
          assetIds: selected,
          platforms: chosen as never,
          language,
          goal,
          scheduledAt: iso,
          extraInstructions: extra || undefined,
        });
        if (r && !r.ok) setError(r.error);
      } catch (e) {
        const msg = (e as Error).message ?? "";
        if (/NEXT_REDIRECT/.test(msg)) throw e;
        setError(msg || L.failed);
      }
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-5">
        <Step n={1} title={L.step1} hint={L.step1Hint}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <button type="button" aria-pressed={projectId === ""} onClick={() => chooseProject("")} className={cn("flex min-h-14 min-w-0 items-center gap-3 rounded-md border p-2.5 text-left text-[13.5px] transition-colors", projectId === "" ? "border-fg bg-surface-2" : "border-line hover:border-line-strong")}>
              <span aria-hidden className="flex h-10 w-10 flex-none items-center justify-center rounded-sm border border-line bg-surface-2 font-mono text-muted">—</span>
              <span>
                <span className="block font-medium text-fg">{L.noProject}</span>
                <span className="block text-xs text-muted">{L.noProjectHint}</span>
              </span>
            </button>
            {projects.map((p) => (
              <button key={p.id} type="button" aria-pressed={projectId === p.id} onClick={() => chooseProject(p.id)} className={cn("flex min-h-14 min-w-0 items-center gap-3 rounded-md border p-2.5 text-left text-[13.5px] transition-colors", projectId === p.id ? "border-fg bg-surface-2" : "border-line hover:border-line-strong")}>
                {p.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.coverUrl} alt="" loading="lazy" className="h-10 w-10 flex-none rounded-sm object-cover" />
                ) : (
                  <span aria-hidden className="flex h-10 w-10 flex-none items-center justify-center rounded-sm border border-line bg-surface-2 font-mono text-[10px] tracking-[0.06em] text-muted uppercase">{p.type.slice(0, 3)}</span>
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg">{p.title}</span>
                  <span className="block truncate font-mono text-[11px] text-muted">{p.code}</span>
                </span>
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title={L.step2} hint={L.step2Hint}>
          {visible.length === 0 ? (
            <p className="text-sm text-muted">
              {project ? L.noMedia : L.noMediaAll}{" "}
              {/* inline-flex + min-h-11 keeps this secondary link a 44 px tap target on phones without changing the paragraph rhythm */}
              <Link className="inline-flex min-h-11 items-center font-medium text-accent hover:underline" href="/admin/media">{L.mediaLink}</Link>
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
              {visible.map((a) => {
                const idx = selected.indexOf(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggle(a.id)}
                    title={a.name}
                    aria-label={a.name}
                    aria-pressed={idx >= 0}
                    className={cn("group relative aspect-square overflow-hidden rounded-sm border transition-colors", idx >= 0 ? "border-fg" : "border-line hover:border-line-strong", full && idx < 0 && "opacity-60")}
                  >
                    {a.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-surface-2">
                        <Video size={16} className="text-faint" />
                      </span>
                    )}
                    {a.mime.startsWith("video/") ? <span className="absolute top-1 left-1 rounded bg-inverse-bg/80 px-1 text-[10px] font-semibold text-inverse-fg">{L.videoTag}</span> : null}
                    {a.kind === "poster" ? <span className="absolute top-1 left-1 rounded bg-accent px-1 text-[10px] font-semibold text-accent-fg">{L.posterTag}</span> : null}
                    {idx >= 0 ? <span className="absolute top-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-sm bg-accent font-mono text-[10px] font-bold text-accent-fg tabular-nums">{idx + 1}</span> : null}
                  </button>
                );
              })}
            </div>
          )}
          {/* Persistent live region: only its text changes, so the cap / pruning hints are announced. */}
          <p role="status" aria-live="polite" className={cn("mt-2 text-xs text-warning", !hint && "sr-only")}>{hint}</p>

          <div className="mt-5 border-t border-line pt-4">
            <div className="mb-2.5 flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
              <ImagePlus size={14} /> {L.poster}
            </div>
            <div className="grid gap-2 sm:grid-cols-[1.4fr_auto_1.4fr_auto]">
              <Select value={posterSource} onChange={(e) => setPosterSource(e.target.value)} aria-label={L.posterSource} className="h-11 text-[13px] sm:h-9">
                <option value="">{L.posterSource}</option>
                {sources.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
              <Select value={ratio} onChange={(e) => setRatio(e.target.value as (typeof RATIOS)[number])} aria-label={L.posterRatio} className="h-11 text-[13px] sm:h-9">
                {RATIOS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder={L.posterHeadline} aria-label={L.posterHeadline} maxLength={80} className="h-11 text-[13px] sm:h-9" />
              <button type="button" onClick={makePoster} disabled={posterPending} className="btn-secondary btn-sm">
                {posterPending ? L.posterRendering : L.posterMake}
              </button>
            </div>
            <p className="caption mt-2">{L.posterSourceHint}</p>
            <p role="status" aria-live="polite" className={cn("mt-2 font-mono text-[11px] text-fg-2", !posterMsg && "sr-only")}>{posterMsg}</p>
          </div>
        </Step>

        <Step n={3} title={L.step3} hint={L.step3Hint}>
          <div className="grid gap-2 sm:grid-cols-2">
            {GOALS.map((g) => (
              <button key={g} type="button" aria-pressed={goal === g} onClick={() => setGoal(g)} className={cn("rounded-md border p-3 text-left transition-colors", goal === g ? "border-fg bg-surface-2" : "border-line hover:border-line-strong")}>
                <span className="flex items-center gap-2 text-[13.5px] font-semibold text-fg">
                  {goal === g ? <Check size={14} aria-hidden className="text-accent" /> : null}
                  {goalLabels[g] ?? g}
                </span>
                <span className="caption mt-1 block">{L.goalHints[g]}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* A group of buttons is not a form control, so it gets a fieldset/legend instead of a <label>
                (clicking a <label> would activate its first button and silently switch the language). */}
            <fieldset className="min-w-0">
              <legend className="label">{L.language}</legend>
              <div className="flex gap-1">
                {LANGS.map((l) => (
                  <button key={l.key} type="button" aria-pressed={language === l.key} onClick={() => setLanguage(l.key)} className={cn("h-11 flex-1 rounded-md border text-[13px] transition-colors", language === l.key ? "border-fg bg-fg text-bg" : "border-line text-fg-2 hover:border-line-strong")}>
                    {l.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <Field label={L.schedule} hint={prefilled && scheduledAt === prefilled ? L.schedulePrefilled : L.scheduleHint}>
              <Input type="datetime-local" value={scheduledAt} min={minSchedule} onChange={(e) => setScheduledAt(e.target.value)} className="min-w-0" />
            </Field>
          </div>

          <div className="mt-4">
            <fieldset className="min-w-0">
              <legend className="label">{L.platforms}</legend>
              <div className="flex flex-wrap gap-2">
                {platforms.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={chosen.includes(p)}
                    onClick={() => togglePlatform(p)}
                    className={cn("inline-flex min-h-11 items-center rounded-sm border px-1.5 transition-opacity", chosen.includes(p) ? "border-fg bg-surface-2" : "border-transparent opacity-55 hover:opacity-100")}
                  >
                    <PlatformChip platform={p} meta={metaMap[p]} size="md" className={chosen.includes(p) ? "" : "border-dashed"} />
                  </button>
                ))}
              </div>
            </fieldset>
            <p role="status" aria-live="polite" className={cn("mt-2 text-xs text-warning", !youtubeNoVideo && "sr-only")}>{youtubeNoVideo ? L.youtubeNeedsVideo : ""}</p>
            {noDefaultPlatforms ? <p className="caption mt-1">{L.noDefaultPlatforms}</p> : null}
          </div>

          <Field label={L.extra} className="mt-4" hint={L.extraHint}>
            <Textarea value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={2000} placeholder={L.extraPlaceholder} />
          </Field>
        </Step>

        <Step n={4} title={L.step4} hint={L.step4Hint}>
          <p role="alert" className={cn("mb-3 rounded-sm border border-danger/30 bg-danger-soft px-3 py-2 text-[13.5px] text-danger", !error && "sr-only border-0 bg-transparent p-0")}>{error}</p>
          <button type="button" onClick={generate} disabled={pending} className="btn-brand hidden sm:inline-flex">
            <Sparkles size={16} aria-hidden /> {pending ? L.generating : L.generate}
          </button>
          <p className="caption mt-3">{L.generateNote}</p>
        </Step>
      </div>

      <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="border-t border-line-strong pt-3">
          <div className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{L.copywriter}</div>
          <div className="mt-2 flex items-center gap-2 text-[13.5px]">
            <span aria-hidden className={cn("h-2 w-2", ai.provider === "template" ? "bg-warning" : "bg-success")} />
            <b className="font-semibold text-fg">{ai.provider}</b>
            <span className="font-mono text-[11px] text-muted">{ai.model}</span>
          </div>
          <p className="caption mt-2 leading-relaxed">{ai.provider === "template" ? L.templateNote : L.aiNote}</p>
        </div>

        <div className="border-t border-line-strong pt-3">
          <div className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{L.summary}</div>
          <dl className="mt-2 divide-y divide-line text-[13.5px]">
            <div className="flex justify-between gap-3 py-1.5"><dt className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">{L.sumProject}</dt><dd className="truncate text-right text-fg">{project ? project.title : "—"}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">{L.sumMedia}</dt><dd className="num text-fg">{selected.length} / {MAX_MEDIA}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">{L.sumGoal}</dt><dd className="text-fg">{goalLabels[goal] ?? goal}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">{L.sumLanguage}</dt><dd className="num text-fg uppercase">{language}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">{L.sumPlatforms}</dt><dd className="num text-fg">{chosen.length}</dd></div>
          </dl>
        </div>
      </aside>

      {/* Sticky action bar on mobile, pinned right above the phone tab bar. */}
      <div className="glass pb-safe fixed inset-x-0 z-20 border-t border-line px-4 py-3 sm:hidden" style={{ bottom: ABOVE_TAB_BAR }}>
        <button type="button" onClick={generate} disabled={pending} className="btn-brand w-full">
          <Sparkles size={16} aria-hidden /> {pending ? L.generating : L.generate}
        </button>
      </div>
    </div>
  );
}
