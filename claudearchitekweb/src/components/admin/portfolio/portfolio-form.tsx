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

export function PortfolioForm({ item, projects, assets, categories }: { item: PfItem; projects: PfProject[]; assets: PfAsset[]; categories: readonly string[] }) {
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
        setError(m || "Could not save the item.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      <section className="card p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Slug" hint="Public URL: /portfolio/<slug>. Left empty it is generated from the title.">
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="aren-kitchen" />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </Select>
          </Field>
          <Field label="Project" hint="Optional link to the CRM project.">
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">— none —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} · {p.title}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(["hy", "ru", "en"] as const).map((l) => (
            <Field key={l} label={`Title (${l.toUpperCase()})`}>
              <Input value={title[l]} onChange={(e) => setTitle({ ...title, [l]: e.target.value })} maxLength={200} />
            </Field>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(["hy", "ru", "en"] as const).map((l) => (
            <Field key={l} label={`Summary (${l.toUpperCase()})`}>
              <Textarea value={summary[l]} onChange={(e) => setSummary({ ...summary, [l]: e.target.value })} maxLength={1000} className="min-h-[110px]" />
            </Field>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Live 3D link" hint="Optional pixel-streaming or viewer URL shown on the public page.">
            <Input value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://live.architeksoft.com/?instanceUuid=…" />
          </Field>
          <Field label="Video">
            <Select value={videoAssetId} onChange={(e) => setVideoAssetId(e.target.value)}>
              <option value="">— none —</option>
              {videos.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-4 pb-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 rounded border-ink-300" /> Published</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 rounded border-ink-300" /> Featured</label>
          </div>
        </div>
      </section>

      <section className="card">
        <header className="border-b border-line px-5 py-3"><h2 className="text-sm font-semibold text-ink-900">Cover</h2></header>
        <div className="p-5">
          {images.length === 0 ? (
            <p className="text-sm text-ink-500">No images{projectId ? " for this project" : ""} yet.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {images.map((a) => (
                <button key={a.id} type="button" title={a.name} onClick={() => setCoverAssetId(a.id === coverAssetId ? "" : a.id)} className={cn("aspect-square overflow-hidden rounded-lg border", coverAssetId === a.id ? "border-brand-500 ring-2 ring-brand-200" : "border-line hover:border-ink-300")}>
                  <img src={a.thumbUrl} alt={a.name} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <header className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-ink-900">Gallery <span className="text-ink-400">({assetIds.length})</span></h2>
        </header>
        <div className="p-5">
          {scoped.length === 0 ? (
            <p className="text-sm text-ink-500">No media available.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {scoped.map((a) => {
                const idx = assetIds.indexOf(a.id);
                return (
                  <button key={a.id} type="button" title={a.name} onClick={() => setAssetIds((s) => (s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id]))} className={cn("relative aspect-square overflow-hidden rounded-lg border", idx >= 0 ? "border-brand-500 ring-2 ring-brand-200" : "border-line hover:border-ink-300")}>
                    {a.thumbUrl ? <img src={a.thumbUrl} alt={a.name} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-ink-100 text-[10px] text-ink-500">video</span>}
                    {idx >= 0 ? <span className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{idx + 1}</span> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="flex gap-2">
        <button type="button" onClick={submit} disabled={pending} className="btn-primary">{pending ? "Saving…" : item.id ? "Save item" : "Create item"}</button>
        <a href="/admin/portfolio" className="btn-ghost">Cancel</a>
      </div>
    </div>
  );
}
