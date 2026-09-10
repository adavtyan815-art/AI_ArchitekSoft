"use client";

/**
 * Four-step post composer: project → media (+ branded poster) → goal/language/platforms → generate.
 * All data is passed from the server page; the two server actions do the real work.
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

const GOALS: { key: Goal; label: string; hint: string }[] = [
  { key: "trust", label: "Trust / expertise", hint: "How we work and why it is precise — for people who do not buy today." },
  { key: "sales_b2b", label: "Sales — B2B", hint: "Furniture makers, showrooms, developers: time saved, fewer errors, faster approvals." },
  { key: "sales_b2c", label: "Sales — B2C", hint: "Households ordering a kitchen: see it in 3D before production, pick materials, get the price." },
  { key: "showcase", label: "Showcase", hint: "Let the render speak: a finished project with a short, calm caption." },
  { key: "education", label: "Education", hint: "Explain one useful idea (materials, hardware, measurements) without selling." },
];

const LANGS: { key: "hy" | "ru" | "en"; label: string }[] = [
  { key: "hy", label: "Հայերեն" },
  { key: "ru", label: "Русский" },
  { key: "en", label: "English" },
];

const RATIOS = ["1:1", "4:5", "16:9", "9:16"] as const;

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <header className="flex items-baseline gap-3 border-b border-line px-5 py-3">
        <span className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-ink-950 text-[11px] font-semibold text-white">{n}</span>
        <div>
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          {hint ? <p className="text-xs text-ink-500">{hint}</p> : null}
        </div>
      </header>
      <div className="p-5">{children}</div>
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
}: {
  projects: ComposerProject[];
  assets: ComposerAsset[];
  metaMap: PlatformMetaMap;
  platforms: string[];
  defaults: { platforms: string[]; language: "hy" | "ru" | "en" };
  ai: { provider: string; model: string };
}) {
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
      setPosterMsg("Pick an image first.");
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
      setPosterMsg(`Poster ${ratio} generated and added to the selection.`);
    });
  }

  function generate() {
    setError("");
    if (chosen.length === 0) {
      setError("Choose at least one platform.");
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
        setError(msg || "Could not generate the post.");
      }
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <Step n={1} title="Project" hint="The project gives the AI the context: type, materials, description, segment. Optional.">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <button type="button" onClick={() => setProjectId("")} className={cn("flex items-center gap-3 rounded-xl border p-3 text-left text-sm", projectId === "" ? "border-ink-950 bg-ink-50" : "border-line hover:border-ink-300")}>
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-ink-100 text-ink-500">—</span>
              <span>
                <span className="block font-medium text-ink-900">No project</span>
                <span className="block text-xs text-ink-500">General brand post</span>
              </span>
            </button>
            {projects.map((p) => (
              <button key={p.id} type="button" onClick={() => setProjectId(p.id)} className={cn("flex items-center gap-3 rounded-xl border p-3 text-left text-sm", projectId === p.id ? "border-ink-950 bg-ink-50" : "border-line hover:border-ink-300")}>
                {p.coverUrl ? <img src={p.coverUrl} alt="" className="h-10 w-10 flex-none rounded-lg object-cover" /> : <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-ink-100 text-[10px] uppercase text-ink-500">{p.type.slice(0, 3)}</span>}
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink-900">{p.title}</span>
                  <span className="block truncate text-xs text-ink-500">{p.code} · {p.type} · {p.segment}</span>
                </span>
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title="Media" hint="Pick renders and/or one video. The first image is the lead visual; a poster is used as the cover on Facebook/Instagram.">
          {visible.length === 0 ? (
            <p className="text-sm text-ink-500">No image or video assets{project ? " for this project" : ""} yet. Upload them in <a className="text-brand-600" href="/admin/media">Media</a>.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
              {visible.map((a) => {
                const idx = selected.indexOf(a.id);
                return (
                  <button key={a.id} type="button" onClick={() => toggle(a.id)} title={a.name} className={cn("group relative aspect-square overflow-hidden rounded-lg border", idx >= 0 ? "border-brand-500 ring-2 ring-brand-200" : "border-line hover:border-ink-300")}>
                    {a.thumbUrl ? <img src={a.thumbUrl} alt={a.name} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-ink-100"><Video size={16} className="text-ink-400" /></span>}
                    {a.mime.startsWith("video/") ? <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">video</span> : null}
                    {a.kind === "poster" ? <span className="absolute left-1 top-1 rounded bg-brand-600/90 px-1 text-[10px] font-semibold text-white">poster</span> : null}
                    {idx >= 0 ? <span className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{idx + 1}</span> : null}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-line bg-ink-50/60 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
              <ImagePlus size={14} /> Generate branded poster
            </div>
            <div className="grid gap-2 sm:grid-cols-[1.4fr_auto_1.4fr_auto]">
              <Select value={posterSource} onChange={(e) => setPosterSource(e.target.value)} className="py-1.5 text-xs">
                <option value="">Source render (first selected image)</option>
                {images.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
              <Select value={ratio} onChange={(e) => setRatio(e.target.value as (typeof RATIOS)[number])} className="py-1.5 text-xs">
                {RATIOS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline on the poster (optional)" maxLength={80} className="py-1.5 text-xs" />
              <button type="button" onClick={makePoster} disabled={posterPending} className="btn-secondary btn-sm">
                {posterPending ? "Rendering…" : "Generate"}
              </button>
            </div>
            {posterMsg ? <p className="mt-2 text-xs text-ink-600">{posterMsg}</p> : null}
          </div>
        </Step>

        <Step n={3} title="Goal, language and platforms" hint="The goal changes the angle of the copy; each platform gets its own adapted variant.">
          <div className="grid gap-2 sm:grid-cols-2">
            {GOALS.map((g) => (
              <button key={g.key} type="button" onClick={() => setGoal(g.key)} className={cn("rounded-xl border p-3 text-left", goal === g.key ? "border-ink-950 bg-ink-50" : "border-line hover:border-ink-300")}>
                <span className="flex items-center gap-2 text-sm font-medium text-ink-900">
                  {goal === g.key ? <Check size={14} className="text-brand-600" /> : null}
                  {g.label}
                </span>
                <span className="mt-0.5 block text-xs text-ink-500">{g.hint}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Language">
              <div className="flex gap-1">
                {LANGS.map((l) => (
                  <button key={l.key} type="button" onClick={() => setLanguage(l.key)} className={cn("flex-1 rounded-lg border px-3 py-1.5 text-sm", language === l.key ? "border-ink-950 bg-ink-950 text-white" : "border-line text-ink-700 hover:border-ink-300")}>
                    {l.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Schedule (Asia/Yerevan, optional)" hint="Leave empty to keep the post as a draft.">
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </Field>
          </div>

          <div className="mt-4">
            <span className="label">Platforms</span>
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <button key={p} type="button" onClick={() => togglePlatform(p)} className={cn("rounded-full border px-1 py-0.5", chosen.includes(p) ? "border-brand-500 bg-brand-50" : "border-transparent opacity-60 hover:opacity-100")}>
                  <PlatformChip platform={p} meta={metaMap[p]} size="md" className={chosen.includes(p) ? "" : "border-dashed"} />
                </button>
              ))}
            </div>
          </div>

          <Field label="Extra instructions for the copywriter" className="mt-4" hint="Optional. E.g. “mention the free 3D preview for the first 5 clients”, “no emojis”, “mention EGGER U999”.">
            <Textarea value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={2000} placeholder="Anything the AI must know or must not say…" />
          </Field>
        </Step>

        <Step n={4} title="Generate" hint="One request produces the shared idea and a variant per platform. You can edit everything afterwards.">
          {error ? <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
          <button type="button" onClick={generate} disabled={pending} className="btn-primary">
            <Sparkles size={16} /> {pending ? "Generating…" : "Generate post pack"}
          </button>
          <p className="mt-2 text-xs text-ink-500">The post is created as a draft (or scheduled) and opens in the editor.</p>
        </Step>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Copywriter</div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className={cn("h-2 w-2 rounded-full", ai.provider === "template" ? "bg-amber-500" : "bg-green-500")} />
            <b className="font-semibold text-ink-900">{ai.provider}</b>
            <span className="text-ink-500">{ai.model}</span>
          </div>
          {ai.provider === "template" ? (
            <p className="mt-2 text-xs text-ink-500">
              No <code>ANTHROPIC_API_KEY</code> / <code>GEMINI_API_KEY</code> is set, so the copy comes from the built-in trilingual templates (hy/ru/en). Everything else — variants, approval, publishing — works the same.
            </p>
          ) : (
            <p className="mt-2 text-xs text-ink-500">Copy is written by {ai.provider} with the brand voice from Settings → SMM.</p>
          )}
        </div>

        <div className="card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Summary</div>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink-500">Project</dt><dd className="truncate text-right text-ink-900">{project ? project.title : "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-500">Media</dt><dd className="text-ink-900">{selected.length}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-500">Goal</dt><dd className="text-ink-900">{goal.replace("_", " ")}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-500">Language</dt><dd className="uppercase text-ink-900">{language}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-500">Platforms</dt><dd className="text-ink-900">{chosen.length}</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
