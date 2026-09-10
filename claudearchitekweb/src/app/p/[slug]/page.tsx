import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { Check, ExternalLink } from "lucide-react";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { mediaSrcSet, mediaUrl } from "@/lib/media";
import { track } from "@/lib/analytics";
import { env } from "@/lib/env";
import { checkAccess, getPortalData, getShareLinkBySlug, passcodeCookieName, recordView } from "@/lib/portal";
import { formatDate } from "@/lib/utils";
import { ContactChannels } from "@/components/site/contact-channels";
import { BeforeAfter } from "@/components/site/before-after";
import { Index, Spec } from "@/components/ui";
import { PortalActions, DownloadLink } from "@/components/portal/actions";
import { Gallery } from "@/components/portal/gallery";
import { FeedbackForm } from "@/components/portal/feedback-form";
import { PasscodeForm } from "@/components/portal/passcode-form";
import { StageStepper } from "@/components/portal/stage-stepper";
import { StickyActions } from "@/components/portal/sticky-actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

/** A few UI strings the shared dictionary does not carry. */
const LOCAL: Record<Locale, { view: string; approvedOn: string; error: string; note: string; changeRequested: string; questionAsked: string; premium: string; approveShort: string; deliverables: string; file: string }> = {
  hy: { view: "Դիտել", approvedOn: "Հաստատված է", error: "Չհաջողվեց ուղարկել։ Փորձեք կրկին կամ գրեք մեզ։", note: "Հաղորդագրություն", changeRequested: "Փոփոխություն է խնդրվել", questionAsked: "Հարց", premium: "Պրեմիում", approveShort: "Հաստատել", deliverables: "Ձեր 3D-ն", file: "Ֆայլ" },
  ru: { view: "Открыть", approvedOn: "Утверждено", error: "Не удалось отправить. Попробуйте ещё раз или напишите нам.", note: "Сообщение", changeRequested: "Запрошены изменения", questionAsked: "Вопрос", premium: "Премиум", approveShort: "Утвердить", deliverables: "Ваш 3D", file: "Файл" },
  en: { view: "View", approvedOn: "Approved", error: "Could not send. Please try again or message us.", note: "Message", changeRequested: "Change requested", questionAsked: "Question", premium: "Premium", approveShort: "Approve", deliverables: "Your 3D", file: "File" },
};

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const [{ slug }, sp, cookieStore] = await Promise.all([params, searchParams, cookies()]);
  const link = getShareLinkBySlug(slug);
  // Only reveal the project name once the link actually opens: otherwise anyone
  // who guesses a slug can read the client's project title from the tab title.
  const access = checkAccess(link, firstParam(sp.k) ?? "", link ? cookieStore.get(passcodeCookieName(link.id))?.value : null);
  const title = access === "ok" && link?.title ? `${link.title} — ArchiTek Soft` : "ArchiTek Soft — KitchenPro";
  return { title, robots: { index: false, follow: false } };
}

function firstParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

/** Section opener: mono index + serif title on a hairline. */
function Head({ n, title, id, className }: { n: number; title: string; id?: string; className?: string }) {
  return (
    <div className={`flex items-baseline gap-4 border-t border-line pt-6 ${className ?? ""}`}>
      <Index n={n} className="flex-none" />
      <h2 id={id} className="font-display text-[1.5rem] leading-tight font-medium text-fg sm:text-[1.75rem]">
        {title}
      </h2>
    </div>
  );
}

/** Free-text materials → spec rows when the client wrote "key: value" lines. */
function parseMaterials(text: string): { k: string; v: string }[] | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  const rows: { k: string; v: string }[] = [];
  for (const line of lines) {
    const m = /^([^:—–-]{2,32})\s*[:—–-]\s*(.+)$/.exec(line);
    if (!m) return null;
    rows.push({ k: m[1].trim(), v: m[2].trim() });
  }
  return rows;
}

export default async function PortalPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [{ slug }, sp, cookieStore, h] = await Promise.all([params, searchParams, cookies(), headers()]);
  const token = firstParam(sp.k) ?? "";
  const link = getShareLinkBySlug(slug);
  const locale: Locale = isLocale(link?.language) ? link!.language : "hy";
  const d = getDictionary(locale);
  const t = LOCAL[locale];
  const brand = getSetting("brand");

  const access = checkAccess(link, token, link ? cookieStore.get(passcodeCookieName(link.id))?.value : null);

  if (access === "not_found" || access === "bad_token") {
    return <StateCard title={d.portal.notFound} brand={brand} dict={d} />;
  }
  if (access === "expired" || access === "inactive") {
    return <StateCard title={d.portal.expired} brand={brand} dict={d} />;
  }
  if (access === "passcode") {
    return (
      <div className="flex min-h-[68vh] w-full items-center px-5 py-16 sm:px-8">
        <PasscodeForm slug={slug} token={token} labels={{ title: d.portal.passcodeTitle, text: d.portal.passcodeText, button: d.portal.passcodeButton, wrong: d.portal.passcodeWrong }} />
      </div>
    );
  }

  const data = getPortalData(slug);
  if (!data) return <StateCard title={d.portal.notFound} brand={brand} dict={d} />;
  const { project, client, renders, videos, sketch, pdf, glb, usdz, documents, feedback } = data;

  // Access granted: record view + analytics (best effort).
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  const ua = h.get("user-agent") ?? "";
  try {
    recordView(data.link.id, ip, ua);
  } catch (e) {
    console.warn("[portal] recordView failed", (e as Error).message);
  }
  track({ type: "portal_view", path: `/p/${slug}`, locale, segment: project.segment, ip, userAgent: ua, meta: { linkId: data.link.id, projectId: project.id } });

  // Absolute page URL (for the AR QR code).
  const proto = h.get("x-forwarded-proto") ?? (env.isProd ? "https" : "http");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base = host ? `${proto}://${host}` : env.appUrl;
  const pageUrl = `${base}/p/${encodeURIComponent(slug)}?k=${encodeURIComponent(token)}`;
  const hasAr = !!(glb || usdz);
  let qrDataUrl: string | null = null;
  if (hasAr) {
    try {
      qrDataUrl = await QRCode.toDataURL(`${pageUrl}#ar`, { margin: 1, width: 360, color: { dark: "#0b1220", light: "#ffffff" } });
    } catch {
      qrDataUrl = null;
    }
  }

  const title = data.link.title || project.title;
  const firstRender = renders[0] ?? null;
  const cover = data.assets.find((a) => a.id === project.coverAssetId) ?? firstRender;
  const showLive = data.link.showLive && !!project.liveUrl;
  // The Web Viewer is the default deliverable: our own /v route when the project
  // has a GLB, otherwise an externally hosted viewer, otherwise nothing.
  const webViewerHref = data.link.showViewer ? (glb ? `/v/${encodeURIComponent(slug)}?k=${encodeURIComponent(token)}` : project.viewerUrl || null) : null;
  const showPdf = data.link.showPdf && (!!pdf || documents.length > 0);
  const approvals = feedback.filter((f) => f.type === "approve");
  const lastApproval = approvals[0] ?? null;
  const recentOther = feedback.filter((f) => f.type !== "approve").slice(0, 3);
  const greetingName = client?.firstName?.trim() || "";

  const stageLabels = d.portal.stages as Record<string, string>;
  const docs = [...(pdf ? [pdf] : []), ...documents];
  const showFeedback = data.link.allowFeedback;
  const materials = project.materials?.trim() ?? "";
  const materialRows = materials ? parseMaterials(materials) : null;

  // Sections are numbered in the order they actually appear on this sheet.
  let n = 0;
  const step = () => (n += 1);
  const nDeliverables = webViewerHref || showLive || hasAr ? step() : 0;
  const nBeforeAfter = sketch && firstRender ? step() : 0;
  const nGallery = renders.length ? step() : 0;
  const nVideo = videos.length ? step() : 0;
  const nDocs = showPdf && docs.length ? step() : 0;
  const nMaterials = materials ? step() : 0;
  const nFeedback = showFeedback ? step() : 0;
  const nContact = step();

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pt-8 pb-32 sm:px-8 sm:pt-12 lg:pb-20">
      {/* PROJECT SHEET HEAD */}
      <section>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="index">{project.code}</span>
          <span className="eyebrow">{d.portal.yourProject}</span>
          {lastApproval ? (
            <span className="badge ml-auto border-transparent bg-success-soft text-success">
              <Check size={13} strokeWidth={2.5} aria-hidden />
              {t.approvedOn} · {formatDate(lastApproval.createdAt)}
            </span>
          ) : null}
        </div>
        <p className="mt-6 text-[15px] text-muted">
          {d.portal.greeting}
          {greetingName ? `, ${greetingName}` : ""}
          {locale === "hy" ? "։" : "!"}
        </p>
        <h1 className="h-display mt-1 text-[2.1rem] sm:text-[2.9rem] lg:text-[3.2rem]">{title}</h1>

        <div className="mt-10">
          <StageStepper current={project.stage} labels={stageLabels} statusLabel={d.portal.status} nextWord={d.common.next} />
        </div>

        {data.link.message ? (
          <div className="mt-10 border-l-2 border-accent bg-accent-soft/45 px-5 py-4">
            <div className="kicker mb-1.5">{t.note}</div>
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-fg">{data.link.message}</p>
          </div>
        ) : null}
      </section>

      {/* DELIVERABLES */}
      {nDeliverables ? (
        <section className="mt-14">
          <Head n={nDeliverables} title={t.deliverables} className="mb-6" />
          <PortalActions
            slug={slug}
            token={token}
            webViewerHref={webViewerHref}
            liveUrl={showLive ? project.liveUrl : null}
            glbUrl={glb ? mediaUrl(glb.relPath) : null}
            usdzUrl={usdz ? mediaUrl(usdz.relPath) : null}
            poster={cover ? mediaUrl(cover.thumbRelPath ?? cover.relPath, 960) : null}
            qrDataUrl={qrDataUrl}
            labels={{ viewer: d.portal.viewer, viewerNote: d.portal.viewerNote, live: d.portal.live, liveNote: d.portal.liveNote, premium: t.premium, ar: d.portal.ar, arNote: d.portal.arNote, close: d.common.close }}
          />
        </section>
      ) : null}

      {/* BEFORE / AFTER */}
      {nBeforeAfter ? (
        <section className="mt-14">
          <Head n={nBeforeAfter} title={d.portal.beforeAfter} className="mb-6" />
          <figure className="frame">
            <BeforeAfter before={mediaUrl(sketch!.relPath, 1280)} after={mediaUrl(firstRender!.relPath, 1280)} labels={[d.portal.before, d.portal.after]} />
            <figcaption className="flex items-center justify-between gap-4 border-t border-line px-3.5 py-2">
              <span className="caption truncate">{d.portal.before} → {d.portal.after}</span>
              <span className="caption flex-none">{project.code}</span>
            </figcaption>
          </figure>
        </section>
      ) : null}

      {/* GALLERY */}
      {nGallery ? (
        <section className="mt-14">
          <Head n={nGallery} title={d.portal.gallery} className="mb-6" />
          <Gallery
            title={d.portal.gallery}
            labels={{ close: d.common.close, prev: d.common.prevImage, next: d.common.nextImage }}
            images={renders.map((a) => ({
              src: mediaUrl(a.relPath, 960),
              srcSet: mediaSrcSet(a.relPath),
              thumb: mediaUrl(a.thumbRelPath ?? a.relPath, 480),
              thumbSrcSet: mediaSrcSet(a.thumbRelPath ?? a.relPath, [320, 480, 960]),
              caption: a.caption,
              width: a.width,
              height: a.height,
            }))}
          />
        </section>
      ) : null}

      {/* VIDEO */}
      {nVideo ? (
        <section className="mt-14">
          <Head n={nVideo} title={d.portal.video} className="mb-6" />
          <div className={`grid gap-5 ${videos.length > 1 ? "md:grid-cols-2" : ""}`}>
            {videos.map((v, i) => (
              <figure key={v.id} className="frame">
                <video controls playsInline preload="none" poster={v.thumbRelPath ? mediaUrl(v.thumbRelPath, 960) : undefined} className="aspect-video w-full bg-stage" src={mediaUrl(v.relPath)} aria-label={v.caption || d.portal.video} />
                <figcaption className="flex items-center justify-between gap-4 border-t border-line px-3.5 py-2">
                  <span className="caption truncate">
                    <span className="text-accent">{String(i + 1).padStart(2, "0")}</span>
                    <span className="mx-2 text-faint">/</span>
                    {v.caption || d.portal.video}
                  </span>
                  <span className="caption flex-none">MP4</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* DOCUMENTS */}
      {nDocs ? (
        <section className="mt-14">
          <Head n={nDocs} title={d.portal.documents} className="mb-2" />
          <ul className="divide-y divide-line border-b border-line">
            {docs.map((doc) => {
              const url = mediaUrl(doc.relPath);
              const ext = (doc.originalName.split(".").pop() || t.file).toUpperCase().slice(0, 4);
              return (
                <li key={doc.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 py-4">
                  <span className="caption w-24 flex-none tabular-nums">
                    <span className="text-fg-2">{ext}</span>
                    {doc.sizeBytes ? <span className="ml-2 text-faint">{(doc.sizeBytes / 1024 / 1024).toFixed(1)} MB</span> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-fg">{doc.caption || doc.originalName}</span>
                    {doc.caption ? <span className="caption block truncate">{doc.originalName}</span> : null}
                  </span>
                  <span className="flex flex-none flex-wrap gap-2">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm min-h-[44px]" aria-label={`${t.view}: ${doc.caption || doc.originalName}`}>
                      <ExternalLink size={15} aria-hidden />
                      {t.view}
                    </a>
                    {data.link.allowDownload ? <DownloadLink slug={slug} token={token} href={`${url}?download=${encodeURIComponent(doc.originalName)}`} name={doc.originalName} label={d.portal.download} className="btn-primary btn-sm min-h-[44px]" /> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* MATERIALS */}
      {nMaterials ? (
        <section className="mt-14">
          <Head n={nMaterials} title={d.portal.materials} className="mb-6" />
          {materialRows ? <Spec rows={materialRows.map((r) => ({ k: r.k, v: r.v }))} /> : <p className="prose-lite border-y border-line py-4 leading-relaxed whitespace-pre-line">{materials}</p>}
        </section>
      ) : null}

      {/* DECISION */}
      {nFeedback ? (
        <section className="mt-14 scroll-mt-20" id="feedback" aria-labelledby="feedback-title">
          <Head n={nFeedback} title={d.portal.feedbackTitle} id="feedback-title" className="mb-6" />
          {lastApproval ? (
            <div className="mb-5 flex items-start gap-3 border-y border-success/40 bg-success-soft px-4 py-3.5 text-sm">
              <Check size={18} strokeWidth={2.5} className="mt-0.5 flex-none text-success" aria-hidden />
              <div>
                <div className="font-semibold text-fg">
                  {t.approvedOn} · {formatDate(lastApproval.createdAt, true)}
                </div>
                {lastApproval.message ? <p className="mt-1 text-fg-2">{lastApproval.message}</p> : null}
              </div>
            </div>
          ) : null}
          {recentOther.length ? (
            <ul className="mb-6 divide-y divide-line border-y border-line">
              {recentOther.map((f) => (
                <li key={f.id} className="py-3.5">
                  <div className="caption">
                    <span className={f.type === "change_request" ? "text-warning" : "text-accent"}>{f.type === "change_request" ? t.changeRequested : t.questionAsked}</span>
                    <span className="mx-2 text-faint">/</span>
                    {formatDate(f.createdAt)}
                    {f.resolved ? <span className="ml-2 text-success">✓</span> : null}
                  </div>
                  {f.message ? <p className="mt-1 text-[15px] text-fg-2">{f.message}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
          <FeedbackForm
            slug={slug}
            token={token}
            defaultContact={client?.phone || client?.telegram || client?.email || ""}
            labels={{
              title: d.portal.feedbackTitle,
              variants: d.portal.variants,
              approve: d.portal.approve,
              change: d.portal.change,
              question: d.portal.question,
              placeholder: d.portal.feedbackPlaceholder,
              contact: d.portal.feedbackContact,
              send: d.portal.feedbackSend,
              sending: d.common.sending,
              thanks: d.portal.feedbackThanks,
              approvedThanks: d.portal.approvedThanks,
              optional: d.common.optional,
              error: t.error,
            }}
          />
        </section>
      ) : null}

      {/* CONTACT */}
      <section className="mt-14">
        <Head n={nContact} title={d.portal.contactTitle} className="mb-4" />
        <ContactChannels brand={brand} dict={d} />
      </section>

      {/* PHONE ACTION BAR */}
      <StickyActions slug={slug} token={token} webViewerHref={webViewerHref} feedbackId={showFeedback ? "feedback" : null} labels={{ viewer: d.portal.viewer, approve: d.portal.approve, approveShort: t.approveShort }} />
    </div>
  );
}

/** Not found / expired: a centred typographic message on grid paper. */
function StateCard({ title, brand, dict }: { title: string; brand: ReturnType<typeof getSetting<"brand">>; dict: ReturnType<typeof getDictionary> }) {
  return (
    <div className="grid-paper flex min-h-[70vh] items-center">
      <div className="mx-auto w-full max-w-md px-5 py-16 text-center sm:px-8">
        <div className="kicker">ArchiTek Soft</div>
        <h1 className="h-sub mt-4 text-balance">{title}</h1>
        <div className="mx-auto mt-8 h-px w-16 bg-line-strong" aria-hidden />
        <div className="mt-8 text-left">
          <div className="kicker mb-3">{dict.portal.contactTitle}</div>
          <ContactChannels brand={brand} dict={dict} />
        </div>
      </div>
    </div>
  );
}
