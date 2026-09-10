import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { CheckCircle2, ExternalLink, FileText, MessageCircleQuestion, PencilLine } from "lucide-react";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { mediaUrl } from "@/lib/media";
import { track } from "@/lib/analytics";
import { env } from "@/lib/env";
import { checkAccess, getPortalData, getShareLinkBySlug, passcodeCookieName, recordView } from "@/lib/portal";
import { formatDate } from "@/lib/utils";
import { ContactChannels } from "@/components/site/contact-channels";
import { BeforeAfter } from "@/components/site/before-after";
import { PortalActions, DownloadLink } from "@/components/portal/actions";
import { Gallery } from "@/components/portal/gallery";
import { FeedbackForm } from "@/components/portal/feedback-form";
import { PasscodeForm } from "@/components/portal/passcode-form";
import { StageStepper } from "@/components/portal/stage-stepper";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

/** A few UI strings the shared dictionary does not carry. */
const LOCAL: Record<Locale, { view: string; approvedOn: string; error: string; close: string; note: string; project: string; changeRequested: string; questionAsked: string }> = {
  hy: { view: "Դիտել", approvedOn: "Հաստատված է", error: "Չհաջողվեց ուղարկել։ Փորձեք կրկին կամ գրեք մեզ։", close: "Փակել", note: "Հաղորդագրություն", project: "Նախագիծ", changeRequested: "Փոփոխություն է խնդրվել", questionAsked: "Հարց" },
  ru: { view: "Открыть", approvedOn: "Утверждено", error: "Не удалось отправить. Попробуйте ещё раз или напишите нам.", close: "Закрыть", note: "Сообщение", project: "Проект", changeRequested: "Запрошены изменения", questionAsked: "Вопрос" },
  en: { view: "View", approvedOn: "Approved", error: "Could not send. Please try again or message us.", close: "Close", note: "Message", project: "Project", changeRequested: "Change requested", questionAsked: "Question" },
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const link = getShareLinkBySlug(slug);
  const title = link?.title ? `${link.title} — ArchiTek Soft` : "ArchiTek Soft — KitchenPro";
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
  const showViewer = data.link.showViewer && !!project.viewerUrl;
  const showPdf = data.link.showPdf && (!!pdf || documents.length > 0);
  const approvals = feedback.filter((f) => f.type === "approve");
  const lastApproval = approvals[0] ?? null;
  const recentOther = feedback.filter((f) => f.type !== "approve").slice(0, 3);
  const greetingName = client?.firstName?.trim() || "";

  const stageLabels = d.portal.stages as Record<string, string>;
  const docs = [...(pdf ? [pdf] : []), ...documents];

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
      {/* HEADER */}
      <section>
        <div className="eyebrow mb-3 inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          {d.portal.yourProject} · {project.code}
        </div>
        <p className="text-lg text-ink-600">
          {d.portal.greeting}
          {greetingName ? `, ${greetingName}` : ""}
          {locale === "hy" ? "։" : locale === "ru" ? "!" : "!"}
        </p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-tight text-ink-950 sm:text-4xl">{title}</h1>
        {lastApproval ? (
          <div className="mt-4">
            <span className="badge border-green-200 bg-green-50 text-green-700">
              <CheckCircle2 size={14} />
              {t.approvedOn} · {formatDate(lastApproval.createdAt)}
            </span>
          </div>
        ) : null}
        <div className="mt-6">
          <StageStepper current={project.stage} labels={stageLabels} statusLabel={d.portal.status} />
        </div>
        {data.link.message ? (
          <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-5 sm:p-6">
            <div className="eyebrow mb-2">{t.note}</div>
            <p className="prose-lite text-base leading-relaxed whitespace-pre-line text-ink-800">{data.link.message}</p>
          </div>
        ) : null}
      </section>

      {/* PRIMARY ACTIONS */}
      {showLive || showViewer || hasAr ? (
        <section className="mt-6">
          <PortalActions
            slug={slug}
            token={token}
            liveUrl={showLive ? project.liveUrl : null}
            viewerUrl={showViewer ? project.viewerUrl : null}
            glbUrl={glb ? mediaUrl(glb.relPath) : null}
            usdzUrl={usdz ? mediaUrl(usdz.relPath) : null}
            poster={cover ? mediaUrl(cover.thumbRelPath ?? cover.relPath) : null}
            qrDataUrl={qrDataUrl}
            labels={{ live: d.portal.live, liveNote: d.portal.liveNote, viewer: d.portal.viewer, ar: d.portal.ar, arNote: d.portal.arNote }}
          />
        </section>
      ) : null}

      {/* BEFORE / AFTER */}
      {sketch && firstRender ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight text-ink-950 sm:text-2xl">{d.portal.beforeAfter}</h2>
          <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-white shadow-card">
            <BeforeAfter before={mediaUrl(sketch.relPath)} after={mediaUrl(firstRender.relPath)} labels={[d.portal.before, d.portal.after]} />
          </div>
        </section>
      ) : null}

      {/* GALLERY */}
      {renders.length ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight text-ink-950 sm:text-2xl">{d.portal.gallery}</h2>
          <div className="mt-4">
            <Gallery title={d.portal.gallery} images={renders.map((a) => ({ src: mediaUrl(a.relPath), thumb: mediaUrl(a.thumbRelPath ?? a.relPath), caption: a.caption, width: a.width, height: a.height }))} />
          </div>
        </section>
      ) : null}

      {/* VIDEO */}
      {videos.length ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight text-ink-950 sm:text-2xl">{d.portal.video}</h2>
          <div className={`mt-4 grid gap-4 ${videos.length > 1 ? "md:grid-cols-2" : ""}`}>
            {videos.map((v) => (
              <figure key={v.id} className="overflow-hidden rounded-2xl border border-line bg-black shadow-soft">
                <video controls playsInline preload="metadata" poster={v.thumbRelPath ? mediaUrl(v.thumbRelPath) : undefined} className="aspect-video w-full bg-black" src={mediaUrl(v.relPath)} />
                {v.caption ? <figcaption className="bg-white px-4 py-2.5 text-sm text-ink-600">{v.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* DOCUMENTS */}
      {showPdf && docs.length ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight text-ink-950 sm:text-2xl">{d.portal.documents}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {docs.map((doc) => {
              const url = mediaUrl(doc.relPath);
              return (
                <div key={doc.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                  <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <FileText size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink-950">{doc.caption || doc.originalName}</div>
                    <div className="mt-0.5 truncate text-xs text-ink-500">
                      {doc.originalName}
                      {doc.sizeBytes ? ` · ${(doc.sizeBytes / 1024 / 1024).toFixed(1)} MB` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                      <ExternalLink size={16} />
                      {t.view}
                    </a>
                    {data.link.allowDownload ? <DownloadLink slug={slug} token={token} href={`${url}?download=${encodeURIComponent(doc.originalName)}`} name={doc.originalName} label={d.portal.download} className="btn-primary" /> : null}
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
          <h2 className="text-xl font-semibold tracking-tight text-ink-950 sm:text-2xl">{d.portal.materials}</h2>
          <div className="card mt-4 p-5 sm:p-6">
            <p className="prose-lite leading-relaxed whitespace-pre-line text-ink-800">{project.materials}</p>
          </div>
        </section>
      ) : null}

      {/* FEEDBACK */}
      {data.link.allowFeedback ? (
        <section className="mt-12" id="feedback">
          <h2 className="text-xl font-semibold tracking-tight text-ink-950 sm:text-2xl">{d.portal.feedbackTitle}</h2>
          {lastApproval ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              <CheckCircle2 size={20} className="mt-0.5 flex-none text-green-600" />
              <div>
                <div className="font-semibold">
                  {t.approvedOn} · {formatDate(lastApproval.createdAt, true)}
                </div>
                {lastApproval.message ? <p className="mt-1 text-green-800">{lastApproval.message}</p> : null}
              </div>
            </div>
          ) : null}
          {recentOther.length ? (
            <ul className="mt-4 space-y-2">
              {recentOther.map((f) => (
                <li key={f.id} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4 text-sm">
                  {f.type === "change_request" ? <PencilLine size={18} className="mt-0.5 flex-none text-amber-600" /> : <MessageCircleQuestion size={18} className="mt-0.5 flex-none text-brand-600" />}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      {f.type === "change_request" ? t.changeRequested : t.questionAsked} · {formatDate(f.createdAt)}
                      {f.resolved ? <span className="ml-2 text-green-600">✓</span> : null}
                    </div>
                    {f.message ? <p className="mt-1 text-ink-800">{f.message}</p> : null}
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
        <h2 className="text-xl font-semibold tracking-tight text-ink-950 sm:text-2xl">{d.portal.contactTitle}</h2>
        <ContactChannels brand={brand} dict={d} className="mt-4" />
      </section>
    </div>
  );
}

function StateCard({ title, brand, dict }: { title: string; brand: ReturnType<typeof getSetting<"brand">>; dict: ReturnType<typeof getDictionary> }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="card mx-auto max-w-xl p-6 text-center sm:p-10">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-500">
          <MessageCircleQuestion size={22} />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink-950">{title}</h1>
        <div className="mt-8 text-left">
          <div className="eyebrow mb-3 text-center">{dict.portal.contactTitle}</div>
          <ContactChannels brand={brand} dict={dict} />
        </div>
      </div>
    </div>
  );
}
