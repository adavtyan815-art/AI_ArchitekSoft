import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { CheckCircle2, ExternalLink, FileText, MessageCircleQuestion, PencilLine } from "lucide-react";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { mediaSrcSet, mediaUrl } from "@/lib/media";
import { track } from "@/lib/analytics";
import { env } from "@/lib/env";
import { checkAccess, getPortalData, getShareLinkBySlug, passcodeCookieName, recordView } from "@/lib/portal";
import { formatDate } from "@/lib/utils";
import { ContactChannels } from "@/components/site/contact-channels";
import { BeforeAfter } from "@/components/site/before-after";
import { IconBox } from "@/components/ui";
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
const LOCAL: Record<Locale, { view: string; approvedOn: string; error: string; note: string; changeRequested: string; questionAsked: string; premium: string; approveShort: string }> = {
  hy: { view: "Դիտել", approvedOn: "Հաստատված է", error: "Չհաջողվեց ուղարկել։ Փորձեք կրկին կամ գրեք մեզ։", note: "Հաղորդագրություն", changeRequested: "Փոփոխություն է խնդրվել", questionAsked: "Հարց", premium: "Պրեմիում", approveShort: "Հաստատել" },
  ru: { view: "Открыть", approvedOn: "Утверждено", error: "Не удалось отправить. Попробуйте ещё раз или напишите нам.", note: "Сообщение", changeRequested: "Запрошены изменения", questionAsked: "Вопрос", premium: "Премиум", approveShort: "Утвердить" },
  en: { view: "View", approvedOn: "Approved", error: "Could not send. Please try again or message us.", note: "Message", changeRequested: "Change requested", questionAsked: "Question", premium: "Premium", approveShort: "Approve" },
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
      <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
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

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pt-8 pb-32 sm:px-8 sm:pt-12 lg:pb-16">
      {/* HEADER */}
      <section>
        <div className="eyebrow mb-3">
          <span className="dot bg-accent" aria-hidden />
          {d.portal.yourProject} · {project.code}
        </div>
        <p className="text-[17px] text-muted">
          {d.portal.greeting}
          {greetingName ? `, ${greetingName}` : ""}
          {locale === "hy" ? "։" : "!"}
        </p>
        <h1 className="h-section mt-1 text-[2rem] sm:text-[2.5rem]">{title}</h1>
        {lastApproval ? (
          <div className="mt-4">
            <span className="badge border-transparent bg-success-soft text-success">
              <CheckCircle2 size={14} aria-hidden />
              {t.approvedOn} · {formatDate(lastApproval.createdAt)}
            </span>
          </div>
        ) : null}
        <div className="mt-6">
          <StageStepper current={project.stage} labels={stageLabels} statusLabel={d.portal.status} nextWord={d.common.next} />
        </div>
        {data.link.message ? (
          <div className="card mt-4 border-accent-soft bg-accent-soft/40 p-5 sm:p-6">
            <div className="eyebrow mb-2">{t.note}</div>
            <p className="prose-lite text-base leading-relaxed whitespace-pre-line text-fg">{data.link.message}</p>
          </div>
        ) : null}
      </section>

      {/* PRIMARY ACTIONS */}
      {webViewerHref || showLive || hasAr ? (
        <section className="mt-6">
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
      {sketch && firstRender ? (
        <section className="mt-10">
          <h2 className="h-section text-[1.4rem] sm:text-[1.75rem]">{d.portal.beforeAfter}</h2>
          <div className="card mt-4 overflow-hidden">
            <BeforeAfter before={mediaUrl(sketch.relPath, 1280)} after={mediaUrl(firstRender.relPath, 1280)} labels={[d.portal.before, d.portal.after]} />
          </div>
        </section>
      ) : null}

      {/* GALLERY */}
      {renders.length ? (
        <section className="mt-10">
          <h2 className="h-section text-[1.4rem] sm:text-[1.75rem]">{d.portal.gallery}</h2>
          <div className="mt-4">
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
          </div>
        </section>
      ) : null}

      {/* VIDEO */}
      {videos.length ? (
        <section className="mt-10">
          <h2 className="h-section text-[1.4rem] sm:text-[1.75rem]">{d.portal.video}</h2>
          <div className={`mt-4 grid gap-4 ${videos.length > 1 ? "md:grid-cols-2" : ""}`}>
            {videos.map((v) => (
              <figure key={v.id} className="card overflow-hidden">
                <video controls playsInline preload="none" poster={v.thumbRelPath ? mediaUrl(v.thumbRelPath, 960) : undefined} className="aspect-video w-full bg-surface-3" src={mediaUrl(v.relPath)} aria-label={v.caption || d.portal.video} />
                {v.caption ? <figcaption className="border-t border-line px-4 py-2.5 text-sm text-muted">{v.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* DOCUMENTS */}
      {showPdf && docs.length ? (
        <section className="mt-10">
          <h2 className="h-section text-[1.4rem] sm:text-[1.75rem]">{d.portal.documents}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {docs.map((doc) => {
              const url = mediaUrl(doc.relPath);
              return (
                <div key={doc.id} className="card flex flex-col gap-4 p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <IconBox>
                      <FileText />
                    </IconBox>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-fg">{doc.caption || doc.originalName}</div>
                      <div className="mt-0.5 truncate text-xs text-muted">
                        {doc.originalName}
                        {doc.sizeBytes ? ` · ${(doc.sizeBytes / 1024 / 1024).toFixed(1)} MB` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-[44px] flex-1" aria-label={`${t.view}: ${doc.caption || doc.originalName}`}>
                      <ExternalLink size={16} aria-hidden />
                      {t.view}
                    </a>
                    {data.link.allowDownload ? <DownloadLink slug={slug} token={token} href={`${url}?download=${encodeURIComponent(doc.originalName)}`} name={doc.originalName} label={d.portal.download} className="btn-primary min-h-[44px] flex-1" /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* MATERIALS */}
      {project.materials?.trim() ? (
        <section className="mt-10">
          <h2 className="h-section text-[1.4rem] sm:text-[1.75rem]">{d.portal.materials}</h2>
          <div className="card mt-4 p-5 sm:p-6">
            <p className="prose-lite leading-relaxed whitespace-pre-line">{project.materials}</p>
          </div>
        </section>
      ) : null}

      {/* VARIANTS / DECISION */}
      {showFeedback ? (
        <section className="mt-12 scroll-mt-20" id="feedback" aria-labelledby="feedback-title">
          <h2 id="feedback-title" className="h-section text-[1.4rem] sm:text-[1.75rem]">
            {d.portal.feedbackTitle}
          </h2>
          {lastApproval ? (
            <div className="card mt-4 flex items-start gap-3 border-success/40 bg-success-soft p-4 text-sm">
              <CheckCircle2 size={20} className="mt-0.5 flex-none text-success" aria-hidden />
              <div>
                <div className="font-semibold text-fg">
                  {t.approvedOn} · {formatDate(lastApproval.createdAt, true)}
                </div>
                {lastApproval.message ? <p className="mt-1 text-fg-2">{lastApproval.message}</p> : null}
              </div>
            </div>
          ) : null}
          {recentOther.length ? (
            <ul className="mt-4 space-y-2">
              {recentOther.map((f) => (
                <li key={f.id} className="card flex items-start gap-3 p-4 text-sm">
                  {f.type === "change_request" ? <PencilLine size={18} className="mt-0.5 flex-none text-warning" aria-hidden /> : <MessageCircleQuestion size={18} className="mt-0.5 flex-none text-accent" aria-hidden />}
                  <div className="min-w-0">
                    <div className="kicker">
                      {f.type === "change_request" ? t.changeRequested : t.questionAsked} · {formatDate(f.createdAt)}
                      {f.resolved ? <span className="ml-2 text-success">✓</span> : null}
                    </div>
                    {f.message ? <p className="mt-1 text-fg-2">{f.message}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4">
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
          </div>
        </section>
      ) : null}

      {/* CONTACT */}
      <section className="mt-12">
        <h2 className="h-section text-[1.4rem] sm:text-[1.75rem]">{d.portal.contactTitle}</h2>
        <ContactChannels brand={brand} dict={d} className="mt-4" />
      </section>

      {/* PHONE ACTION BAR */}
      <StickyActions slug={slug} token={token} webViewerHref={webViewerHref} feedbackId={showFeedback ? "feedback" : null} labels={{ viewer: d.portal.viewer, approve: d.portal.approve, approveShort: t.approveShort }} />
    </div>
  );
}

function StateCard({ title, brand, dict }: { title: string; brand: ReturnType<typeof getSetting<"brand">>; dict: ReturnType<typeof getDictionary> }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="card mx-auto max-w-xl p-6 text-center sm:p-10">
        <IconBox tone="neutral" size="lg" className="mx-auto">
          <MessageCircleQuestion />
        </IconBox>
        <h1 className="h-section mt-4 text-[1.5rem] sm:text-[1.75rem]">{title}</h1>
        <div className="mt-8 text-left">
          <div className="eyebrow mb-3 justify-center">{dict.portal.contactTitle}</div>
          <ContactChannels brand={brand} dict={dict} />
        </div>
      </div>
    </div>
  );
}
