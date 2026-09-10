"use client";

/**
 * Four-step post composer: project → media (+ branded poster) → goal/language/platforms → generate.
 * All data and every visible string come from the server page; the two server actions do the work.
 */
import { useMemo, useState, useTransition } from "react";
import { Check, ImagePlus, Sparkles, Video } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { PlatformChip, type PlatformMetaMap } from "@/components/admin/smm/platform-chip";
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
};

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
  defaults: { platforms: string[]; language: "hy" | "ru" | "en" };
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
  const [chosen, setChosen] = useState<string[]>(defaults.platforms.length ? defaults.platforms : ["facebook", "instagram"]);
  const [extra, setExtra] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [posterSource, setPosterSource] = useState("");
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>("4:5");
  const [headline, setHeadline] = useState("");
  const [error, setError] = useState("");
  const [posterMsg, setPosterMsg] = useState("");
  const [pending, start] = useTransition();
  const [posterPending, startPoster] = useTransition();

  const visible = useMemo(() => {
    const list = projectId ? assets.filter((a) => a.projectId === projectId) : assets;
    return list.slice(0, 120);
  }, [assets, projectId]);
  const images = visible.filter((a) => a.mime.startsWith("image/"));
  const project = projects.find((p) => p.id === projectId) ?? null;

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  function togglePlatform(p: string) {
    setChosen((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  }

  function makePoster() {
    const src = posterSource || images.find((a) => selected.includes(a.id))?.id || images[0]?.id || "";
    if (!src) {
      setPosterMsg(L.posterPickFirst);
      return;
    }
    setPosterMsg("");
    startPoster(async () => {
      const r = await generatePosterAction({ sourceAssetId: src, ratio, headline: headline || undefined, projectId: projectId || null });
      if (!r.ok) {
        setPosterMsg(r.error);
        return;
      }
      const a = r.asset;
      setAssets((prev) => [{ id: a.id, name: a.name, kind: a.kind, mime: a.mime, projectId: a.projectId, thumbUrl: a.thumbUrl, durationSec: a.durationSec }, ...prev]);
      setSelected((s) => [...s, a.id]);
      setPosterMsg(`${L.posterDone} (${ratio})`);
    });
  }

  function generate() {
    setError("");
    if (chosen.length === 0) {
      setError(L.pickPlatform);
      return;
    }
    start(async () => {
      try {
        await createPostAction({
          projectId: projectId || null,
          assetIds: selected,
          platforms: chosen as never,
          language,
          goal,
          scheduledAt: scheduledAt ? new Date(`${scheduledAt}:00+04:00`).toISOString() : null,
          extraInstructions: extra || undefined,
        });
      } catch (e) {
        const msg = (e as Error).message ?? "";
        if (/NEXT_REDIRECT/.test(msg)) throw e;
        setError(msg || L.failed);
      }
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-5 pb-24 lg:pb-0">
        <Step n={1} title={L.step1} hint={L.step1Hint}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <button type="button" onClick={() => setProjectId("")} className={cn("flex min-w-0 items-center gap-3 rounded-md border p-2.5 text-left text-[13.5px] transition-colors", projectId === "" ? "border-fg bg-surface-2" : "border-line hover:border-line-strong")}>
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm border border-line bg-surface-2 font-mono text-muted">—</span>
              <span>
                <span className="block font-medium text-fg">{L.noProject}</span>
                <span className="block text-xs text-muted">{L.noProjectHint}</span>
              </span>
            </button>
            {projects.map((p) => (
              <button key={p.id} type="button" onClick={() => setProjectId(p.id)} className={cn("flex min-w-0 items-center gap-3 rounded-md border p-2.5 text-left text-[13.5px] transition-colors", projectId === p.id ? "border-fg bg-surface-2" : "border-line hover:border-line-strong")}>
                {p.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.coverUrl} alt="" loading="lazy" className="h-10 w-10 flex-none rounded-sm object-cover" />
                ) : (
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm border border-line bg-surface-2 font-mono text-[10px] tracking-[0.06em] text-muted uppercase">{p.type.slice(0, 3)}</span>
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
              <a className="font-medium text-accent hover:underline" href="/admin/media">{L.mediaLink}</a>
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
              {visible.map((a) => {
                const idx = selected.indexOf(a.id);
                return (
                  <button key={a.id} type="button" onClick={() => toggle(a.id)} title={a.name} className={cn("group relative aspect-square overflow-hidden rounded-sm border transition-colors", idx >= 0 ? "border-fg" : "border-line hover:border-line-strong")}>
                    {a.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.thumbUrl} alt={a.name} loading="lazy" className="h-full w-full object-cover" />
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

          <div className="mt-5 border-t border-line pt-4">
            <div className="mb-2.5 flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
              <ImagePlus size={14} /> {L.poster}
            </div>
            <div className="grid gap-2 sm:grid-cols-[1.4fr_auto_1.4fr_auto]">
              <Select value={posterSource} onChange={(e) => setPosterSource(e.target.value)} className="h-9 text-[13px]">
                <option value="">{L.posterSource}</option>
                {images.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
              <Select value={ratio} onChange={(e) => setRatio(e.target.value as (typeof RATIOS)[number])} className="h-9 text-[13px]">
                {RATIOS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder={L.posterHeadline} maxLength={80} className="h-9 text-[13px]" />
              <button type="button" onClick={makePoster} disabled={posterPending} className="btn-secondary btn-sm">
                {posterPending ? L.posterRendering : L.posterMake}
              </button>
            </div>
            {posterMsg ? <p className="mt-2 font-mono text-[11px] text-fg-2">{posterMsg}</p> : null}
          </div>
        </Step>

        <Step n={3} title={L.step3} hint={L.step3Hint}>
          <div className="grid gap-2 sm:grid-cols-2">
            {GOALS.map((g) => (
              <button key={g} type="button" onClick={() => setGoal(g)} className={cn("rounded-md border p-3 text-left transition-colors", goal === g ? "border-fg bg-surface-2" : "border-line hover:border-line-strong")}>
                <span className="flex items-center gap-2 text-[13.5px] font-semibold text-fg">
                  {goal === g ? <Check size={14} className="text-accent" /> : null}
                  {goalLabels[g] ?? g}
                </span>
                <span className="caption mt-1 block">{L.goalHints[g]}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={L.language}>
              <div className="flex gap-1">
                {LANGS.map((l) => (
                  <button key={l.key} type="button" onClick={() => setLanguage(l.key)} className={cn("h-11 flex-1 rounded-md border text-[13px] transition-colors", language === l.key ? "border-fg bg-fg text-bg" : "border-line text-fg-2 hover:border-line-strong")}>
                    {l.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={L.schedule} hint={L.scheduleHint}>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="min-w-0" />
            </Field>
          </div>

          <div className="mt-4">
            <span className="label">{L.platforms}</span>
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <button key={p} type="button" onClick={() => togglePlatform(p)} className={cn("rounded-sm border p-0.5 transition-opacity", chosen.includes(p) ? "border-fg bg-surface-2" : "border-transparent opacity-55 hover:opacity-100")}>
                  <PlatformChip platform={p} meta={metaMap[p]} size="md" className={chosen.includes(p) ? "" : "border-dashed"} />
                </button>
              ))}
            </div>
          </div>

          <Field label={L.extra} className="mt-4" hint={L.extraHint}>
            <Textarea value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={2000} placeholder={L.extraPlaceholder} />
          </Field>
        </Step>

        <Step n={4} title={L.step4} hint={L.step4Hint}>
          {error ? <p className="mb-3 rounded-sm border border-danger/30 bg-danger-soft px-3 py-2 text-[13.5px] text-danger">{error}</p> : null}
          <button type="button" onClick={generate} disabled={pending} className="btn-brand hidden sm:inline-flex">
            <Sparkles size={16} /> {pending ? L.generating : L.generate}
          </button>
          <p className="caption mt-3">{L.generateNote}</p>
        </Step>
      </div>

      <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="border-t border-line-strong pt-3">
          <div className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{L.copywriter}</div>
          <div className="mt-2 flex items-center gap-2 text-[13.5px]">
            <span className={cn("h-2 w-2", ai.provider === "template" ? "bg-warning" : "bg-success")} />
            <b className="font-semibold text-fg">{ai.provider}</b>
            <span className="font-mono text-[11px] text-muted">{ai.model}</span>
          </div>
          <p className="caption mt-2 leading-relaxed">{ai.provider === "template" ? L.templateNote : L.aiNote}</p>
        </div>

        <div className="border-t border-line-strong pt-3">
          <div className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{L.summary}</div>
          <dl className="mt-2 divide-y divide-line text-[13.5px]">
            <div className="flex justify-between gap-3 py-1.5"><dt className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">{L.sumProject}</dt><dd className="truncate text-right text-fg">{project ? project.title : "—"}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">{L.sumMedia}</dt><dd className="num text-fg">{selected.length}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">{L.sumGoal}</dt><dd className="text-fg">{goalLabels[goal] ?? goal}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">{L.sumLanguage}</dt><dd className="num text-fg uppercase">{language}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">{L.sumPlatforms}</dt><dd className="num text-fg">{chosen.length}</dd></div>
          </dl>
        </div>
      </aside>

      {/* Sticky action bar on mobile */}
      <div className="glass pb-safe fixed inset-x-0 bottom-[68px] z-20 border-t border-line px-4 py-3 sm:hidden">
        <button type="button" onClick={generate} disabled={pending} className="btn-brand w-full">
          <Sparkles size={16} /> {pending ? L.generating : L.generate}
        </button>
      </div>
    </div>
  );
}
