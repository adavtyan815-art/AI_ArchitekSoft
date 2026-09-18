"use client";

/**
 * "🎨 Studio Visual Layouts": three static 4:5 graphics (lib/social/studio-visuals.ts) composed from
 * a post's own photos — an Editorial Cover, a Color & Material Palette card, and a Split Detail
 * (overview + close-up) card. Generating one calls the server, then hands the new asset up to
 * PostEditor's own `attached` state via `onGenerated` — it appears in the media strip and every
 * platform preview immediately, exactly like an uploaded photo, and the existing remove (X) button
 * on its media-strip tile is the "discard this layout" control; nothing bespoke is needed for that.
 */
import { useState } from "react";
import { BookImage, Columns2, LayoutTemplate, Palette } from "lucide-react";
import { Field, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { generateStudioVisualAction } from "@/app/admin/actions/smm-actions";

export type VisualSourceImage = { id: string; name: string; thumbUrl: string };

export type GeneratedVisualAsset = {
  id: string;
  name: string;
  kind: string;
  mime: string;
  projectId: string | null;
  thumbUrl: string;
  url: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
};

export type StudioVisualsLabels = {
  studioVisualsTitle: string;
  studioVisualsHint: string;
  tabCover: string;
  tabPalette: string;
  tabSplit: string;
  coverSourceLabel: string;
  coverTitleLabel: string;
  coverMaterialsLabel: string;
  coverMaterialsPlaceholder: string;
  paletteSourceLabel: string;
  paletteHint: string;
  splitWideImageLabel: string;
  splitDetailImageLabel: string;
  splitWideCaption: string;
  splitDetailCaption: string;
  pickImage: string;
  generateVisual: string;
  generatingVisual: string;
  needsOneImage: string;
  needsTwoImages: string;
  visualGenerated: string;
  genericError: string;
};

type Tab = "cover" | "palette" | "split";
const TABS: Tab[] = ["cover", "palette", "split"];

function ImagePicker({ images, value, onChange, labels, className }: { images: VisualSourceImage[]; value: string; onChange: (id: string) => void; labels: StudioVisualsLabels; className?: string }) {
  const picked = images.find((i) => i.id === value);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1">
        <option value="" disabled>{labels.pickImage}</option>
        {images.map((img) => (
          <option key={img.id} value={img.id}>{img.name}</option>
        ))}
      </Select>
      {picked?.thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={picked.thumbUrl} alt="" className="h-10 w-10 flex-none rounded-sm border border-line object-cover" />
      ) : (
        <span aria-hidden className="h-10 w-10 flex-none rounded-sm border border-dashed border-line" />
      )}
    </div>
  );
}

export function StudioVisualsPanel({
  postId,
  images,
  defaultTitle,
  labels,
  onGenerated,
  onMessage,
}: {
  postId: string;
  images: VisualSourceImage[];
  defaultTitle: string;
  labels: StudioVisualsLabels;
  onGenerated: (asset: GeneratedVisualAsset) => void;
  onMessage: (text: string, tone: "ok" | "error") => void;
}) {
  const L = labels;
  const [tab, setTab] = useState<Tab>("cover");
  const [busy, setBusy] = useState(false);

  const [coverSource, setCoverSource] = useState("");
  const [coverTitle, setCoverTitle] = useState(defaultTitle);
  const [coverMaterials, setCoverMaterials] = useState("");

  const [paletteSource, setPaletteSource] = useState("");

  const [splitWide, setSplitWide] = useState("");
  const [splitDetail, setSplitDetail] = useState("");
  const [splitWideCaption, setSplitWideCaption] = useState("");
  const [splitDetailCaption, setSplitDetailCaption] = useState("");

  const tabIcon: Record<Tab, React.ReactNode> = {
    cover: <BookImage size={13} aria-hidden />,
    palette: <Palette size={13} aria-hidden />,
    split: <Columns2 size={13} aria-hidden />,
  };
  const tabLabel: Record<Tab, string> = { cover: L.tabCover, palette: L.tabPalette, split: L.tabSplit };

  async function generate() {
    if (busy) return;
    let payload: Parameters<typeof generateStudioVisualAction>[0] | null = null;
    if (tab === "cover") {
      if (!coverSource || !coverTitle.trim()) return;
      payload = { template: "cover", postId, sourceAssetId: coverSource, title: coverTitle.trim(), materials: coverMaterials.trim() || undefined };
    } else if (tab === "palette") {
      if (!paletteSource) return;
      payload = { template: "palette", postId, sourceAssetId: paletteSource };
    } else {
      if (!splitWide || !splitDetail) return;
      payload = {
        template: "split",
        postId,
        wideAssetId: splitWide,
        detailAssetId: splitDetail,
        wideLabel: splitWideCaption.trim() || undefined,
        detailLabel: splitDetailCaption.trim() || undefined,
      };
    }
    setBusy(true);
    try {
      const r = await generateStudioVisualAction(payload);
      if (!r.ok) {
        onMessage(r.error, "error");
        return;
      }
      onGenerated({ id: r.asset.id, name: r.asset.name, kind: r.asset.kind, mime: r.asset.mime, projectId: r.asset.projectId, thumbUrl: r.asset.thumbUrl, url: r.asset.url, width: r.asset.width, height: r.asset.height, durationSec: r.asset.durationSec });
      onMessage(L.visualGenerated, "ok");
    } catch (e) {
      onMessage((e as Error).message || L.genericError, "error");
    } finally {
      setBusy(false);
    }
  }

  const canGenerate =
    !busy &&
    (tab === "cover" ? !!coverSource && !!coverTitle.trim() : tab === "palette" ? !!paletteSource : !!splitWide && !!splitDetail);

  return (
    <section className="card">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3 sm:px-5">
        <LayoutTemplate size={15} aria-hidden className="text-muted" />
        <h2 className="font-display text-[1.05rem] leading-tight font-medium tracking-[-0.01em] text-fg">{L.studioVisualsTitle}</h2>
      </header>
      <div className="space-y-4 p-4 sm:p-5">
        <p className="text-xs text-muted">{L.studioVisualsHint}</p>

        <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-sm border border-line p-0.5">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-sm px-3 text-[12px] font-medium whitespace-nowrap transition-colors",
                tab === t ? "bg-fg text-inverse-fg" : "text-muted hover:text-fg",
              )}
            >
              {tabIcon[t]} {tabLabel[t]}
            </button>
          ))}
        </div>

        {images.length === 0 ? (
          <p className="text-xs text-warning">{L.needsOneImage}</p>
        ) : (
          <>
            {tab === "cover" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={L.coverSourceLabel} className="sm:col-span-2">
                  <ImagePicker images={images} value={coverSource} onChange={setCoverSource} labels={L} />
                </Field>
                <Field label={L.coverTitleLabel}>
                  <Input value={coverTitle} onChange={(e) => setCoverTitle(e.target.value)} maxLength={160} />
                </Field>
                <Field label={L.coverMaterialsLabel}>
                  <Input value={coverMaterials} onChange={(e) => setCoverMaterials(e.target.value)} placeholder={L.coverMaterialsPlaceholder} maxLength={120} />
                </Field>
              </div>
            ) : tab === "palette" ? (
              <div className="space-y-2">
                <Field label={L.paletteSourceLabel}>
                  <ImagePicker images={images} value={paletteSource} onChange={setPaletteSource} labels={L} />
                </Field>
                <p className="text-xs text-faint">{L.paletteHint}</p>
              </div>
            ) : images.length < 2 ? (
              <p className="text-xs text-warning">{L.needsTwoImages}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={L.splitWideImageLabel}>
                  <ImagePicker images={images} value={splitWide} onChange={setSplitWide} labels={L} />
                </Field>
                <Field label={L.splitDetailImageLabel}>
                  <ImagePicker images={images} value={splitDetail} onChange={setSplitDetail} labels={L} />
                </Field>
                <Field label={L.splitWideCaption}>
                  <Input value={splitWideCaption} onChange={(e) => setSplitWideCaption(e.target.value)} placeholder="OVERVIEW" maxLength={40} />
                </Field>
                <Field label={L.splitDetailCaption}>
                  <Input value={splitDetailCaption} onChange={(e) => setSplitDetailCaption(e.target.value)} placeholder="TEXTURE & JOINERY" maxLength={40} />
                </Field>
              </div>
            )}

            <button type="button" onClick={generate} disabled={!canGenerate} className="btn-secondary btn-sm">
              {busy ? L.generatingVisual : L.generateVisual}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
