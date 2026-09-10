"use client";

/** Create / edit form for a public portfolio item. Calls savePortfolioAction (which redirects). */
import { useState, useTransition } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { savePortfolioAction } from "@/app/admin/actions/portfolio-actions";

export type PfAsset = { id: string; name: string; mime: string; projectId: string | null; thumbUrl: string };
export type PfProject = { id: string; code: string; title: string };

export type PfItem = {
  id?: string;
  slug: string;
  category: string;
  title: { hy: string; ru: string; en: string };
  summary: { hy: string; ru: string; en: string };
  projectId: string | null;
  coverAssetId: string | null;
  assetIds: string[];
  videoAssetId: string | null;
  liveUrl: string | null;
  isPublished: boolean;
  isFeatured: boolean;
};

export type PfLabels = {
  basics: string; slug: string; slugHint: string; category: string; project: string; projectHint: string; none: string;
  titleLang: string; summaryLang: string; liveUrl: string; liveUrlHint: string; video: string;
  published: string; featured: string; cover: string; gallery: string; noImages: string; noMedia: string;
  save: string; create: string; saving: string; cancel: string; failed: string;
};

export function PortfolioForm({
  item,
  projects,
  assets,
  categories,
  labels,
  categoryLabels,
}: {
  item: PfItem;
  projects: PfProject[];
  assets: PfAsset[];
  categories: readonly string[];
  labels: PfLabels;
  categoryLabels: Record<string, string>;
}) {
  const L = labels;
  const [slug, setSlug] = useState(item.slug);
  const [category, setCategory] = useState(item.category);
  const [title, setTitle] = useState(item.title);
  const [summary, setSummary] = useState(item.summary);
  const [projectId, setProjectId] = useState(item.projectId ?? "");
  const [coverAssetId, setCoverAssetId] = useState(item.coverAssetId ?? "");
  const [assetIds, setAssetIds] = useState<string[]>(item.assetIds);
  const [videoAssetId, setVideoAssetId] = useState(item.videoAssetId ?? "");
  const [liveUrl, setLiveUrl] = useState(item.liveUrl ?? "");
  const [isPublished, setIsPublished] = useState(item.isPublished);
  const [isFeatured, setIsFeatured] = useState(item.isFeatured);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const scoped = projectId ? assets.filter((a) => a.projectId === projectId) : assets;
  const images = scoped.filter((a) => a.mime.startsWith("image/"));
  const videos = assets.filter((a) => a.mime.startsWith("video/"));

  function submit() {
    setError("");
    start(async () => {
      try {
        const r = await savePortfolioAction({
          id: item.id,
          slug,
          category: category as never,
          title,
          summary,
          projectId: projectId || null,
          coverAssetId: coverAssetId || null,
          assetIds,
          videoAssetId: videoAssetId || null,
          liveUrl: liveUrl || null,
          isPublished,
          isFeatured,
        });
        if (r && !r.ok) setError(r.error);
      } catch (e) {
        const m = (e as Error).message ?? "";
        if (/NEXT_REDIRECT/.test(m)) throw e;
        setError(m || L.failed);
      }
    });
  }

  return (
    <div className="min-w-0 space-y-5 pb-24 sm:pb-0">
      {error ? <p className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

      <section className="card p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={L.slug} hint={L.slugHint}>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="aren-kitchen" />
          </Field>
          <Field label={L.category}>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>{categoryLabels[c] ?? c}</option>
              ))}
            </Select>
          </Field>
          <Field label={L.project} hint={L.projectHint}>
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">{L.none}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} · {p.title}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(["hy", "ru", "en"] as const).map((l) => (
            <Field key={l} label={`${L.titleLang} (${l.toUpperCase()})`}>
              <Input value={title[l]} onChange={(e) => setTitle({ ...title, [l]: e.target.value })} maxLength={200} />
            </Field>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(["hy", "ru", "en"] as const).map((l) => (
            <Field key={l} label={`${L.summaryLang} (${l.toUpperCase()})`}>
              <Textarea value={summary[l]} onChange={(e) => setSummary({ ...summary, [l]: e.target.value })} maxLength={1000} className="min-h-[110px]" />
            </Field>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label={L.liveUrl} hint={L.liveUrlHint}>
            <Input value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://live.architeksoft.com/?instanceUuid=…" />
          </Field>
          <Field label={L.video}>
            <Select value={videoAssetId} onChange={(e) => setVideoAssetId(e.target.value)}>
              <option value="">{L.none}</option>
              {videos.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-wrap items-end gap-4 pb-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 rounded-none border-line-strong accent-[var(--accent)]" /> {L.published}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 rounded-none border-line-strong accent-[var(--accent)]" /> {L.featured}
            </label>
          </div>
        </div>
      </section>

      <section className="card">
        <header className="border-b border-line px-4 py-2.5 sm:px-5"><h2 className="font-display text-[1.05rem] leading-tight font-medium tracking-[-0.01em] text-fg">{L.cover}</h2></header>
        <div className="p-4 sm:p-5">
          {images.length === 0 ? (
            <p className="text-sm text-muted">{L.noImages}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {images.map((a) => (
                <button key={a.id} type="button" title={a.name} onClick={() => setCoverAssetId(a.id === coverAssetId ? "" : a.id)} className={cn("aspect-square overflow-hidden rounded-lg border transition-colors", coverAssetId === a.id ? "border-accent ring-2 ring-accent-soft" : "border-line hover:border-line-strong")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.thumbUrl} alt={a.name} loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <header className="border-b border-line px-4 py-3 sm:px-5">
          <h2 className="font-display text-[1.05rem] leading-tight font-medium tracking-[-0.01em] text-fg">{L.gallery} <span className="num text-[12px] text-faint">({assetIds.length})</span></h2>
        </header>
        <div className="p-4 sm:p-5">
          {scoped.length === 0 ? (
            <p className="text-sm text-muted">{L.noMedia}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {scoped.map((a) => {
                const idx = assetIds.indexOf(a.id);
                return (
                  <button key={a.id} type="button" title={a.name} onClick={() => setAssetIds((s) => (s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id]))} className={cn("relative aspect-square overflow-hidden rounded-lg border transition-colors", idx >= 0 ? "border-accent ring-2 ring-accent-soft" : "border-line hover:border-line-strong")}>
                    {a.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.thumbUrl} alt={a.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-surface-2 text-[10px] text-muted">{L.video}</span>
                    )}
                    {idx >= 0 ? <span className="absolute top-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-sm bg-accent font-mono text-[10px] font-bold text-accent-fg tabular-nums">{idx + 1}</span> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="glass pb-safe fixed inset-x-0 bottom-[68px] z-20 flex gap-2 border-t border-line px-4 py-3 sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <button type="button" onClick={submit} disabled={pending} className="btn-brand flex-1 sm:flex-none">{pending ? L.saving : item.id ? L.save : L.create}</button>
        <a href="/admin/portfolio" className="btn-ghost">{L.cancel}</a>
      </div>
    </div>
  );
}
