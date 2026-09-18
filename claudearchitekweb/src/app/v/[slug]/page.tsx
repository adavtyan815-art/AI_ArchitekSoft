import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getSetting, type BrandSettings } from "@/lib/settings";
import { mediaSrcSet, mediaUrl } from "@/lib/media";
import { track } from "@/lib/analytics";
import { env } from "@/lib/env";
import { checkAccess, getPortalData, getShareLinkBySlug, passcodeCookieName, recordView, type AccessResult } from "@/lib/portal";
import { ContactChannels } from "@/components/site/contact-channels";
import { HtmlLang } from "@/components/site/html-lang";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { Index } from "@/components/ui";
import { PortalChrome, PortalState } from "@/components/portal/chrome";
import { Gallery } from "@/components/portal/gallery";
import { OpenViewerBeacon } from "@/components/portal/open-viewer-beacon";
import { PasscodeForm } from "@/components/portal/passcode-form";
import { PORTAL_TEXT } from "@/components/portal/strings";
import { ViewerShell } from "@/components/portal/viewer-shell";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

function firstParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const [{ slug }, sp, cookieStore] = await Promise.all([params, searchParams, cookies()]);
  const link = getShareLinkBySlug(slug);
  // Same rule as /p: never leak the project name to someone who guessed a slug.
  const access = checkAccess(link, firstParam(sp.k) ?? "", link ? cookieStore.get(passcodeCookieName(link.id))?.value : null);
  const title = access === "ok" && link?.title ? `${link.title} — 3D — ArchiTek Soft` : "ArchiTek Soft";
  // Same as /p: a dead link says so in the preview card instead of unfurling like a working page,
  // and the two states that answer 404 leave `robots` to Next's own noindex tag so there is exactly
  // one of them in the document (the X-Robots-Tag header covers /v either way).
  const gone = access === "not_found" || access === "bad_token";
  return {
    title,
    description: goneDescription(access, link?.language),
    ...(gone ? {} : { robots: { index: false, follow: false } }),
  };
}

/** The one sentence a dead client link should show wherever it is unfurled — otherwise nothing. */
function goneDescription(access: AccessResult, language: string | null | undefined): string | undefined {
  if (access !== "expired" && access !== "inactive") return undefined;
  const locale: Locale = isLocale(language) ? language : "hy";
  return access === "inactive" ? PORTAL_TEXT[locale].inactive : getDictionary(locale).portal.expired;
}

export default async function ProjectViewerPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [{ slug }, sp, cookieStore, h] = await Promise.all([params, searchParams, cookies(), headers()]);
  const token = firstParam(sp.k) ?? "";
  const link = getShareLinkBySlug(slug);
  const brand = getSetting("brand");

  const access = checkAccess(link, token, link ? cookieStore.get(passcodeCookieName(link.id))?.value : null);

  // Same answer for an unknown slug and a wrong key, in the visitor's own language (404).
  if (access === "not_found" || access === "bad_token") notFound();

  const locale: Locale = isLocale(link?.language) ? link!.language : "hy";
  const d = getDictionary(locale);
  const t = PORTAL_TEXT[locale];
  const backHref = `/p/${encodeURIComponent(slug)}?k=${encodeURIComponent(token)}`;

  if (access === "expired" || access === "inactive") {
    return (
      <StateShell locale={locale} dict={d} brand={brand}>
        <PortalState title={access === "inactive" ? t.inactive : d.portal.expired} dict={d} brand={brand} />
      </StateShell>
    );
  }
  if (access === "passcode") {
    // The same gate, the same brand shell as /p: a client who opens the viewer link
    // first must still see whose page is asking for a code.
    return (
      <StateShell locale={locale} dict={d} brand={brand}>
        <div className="flex flex-1 items-center px-5 py-16 sm:px-8">
          <PasscodeForm
            slug={slug}
            token={token}
            labels={{ title: d.portal.passcodeTitle, text: d.portal.passcodeText, button: d.portal.passcodeButton, wrong: d.portal.passcodeWrong, error: t.passcodeError, locked: t.passcodeLocked, hint: t.passcodeHint, sending: d.common.sending }}
          >
            <div className="kicker mb-3">{t.noCode}</div>
            <ContactChannels brand={brand} dict={d} />
          </PasscodeForm>
        </div>
      </StateShell>
    );
  }

  const data = getPortalData(slug);
  if (!data) notFound();
  // "Show Web Viewer" off hides the cell on /p; a hand-typed or earlier-shared /v
  // address must respect the same switch instead of serving the model anyway.
  if (!data.link.showViewer) redirect(backHref);

  const { project, renders, glb, usdz } = data;

  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  const ua = h.get("user-agent") ?? "";
  try {
    recordView(data.link.id, ip, ua);
  } catch (e) {
    console.warn("[viewer] recordView failed", (e as Error).message);
  }
  track({ type: "portal_view", path: `/v/${slug}`, locale, segment: project.segment, ip, userAgent: ua, meta: { linkId: data.link.id, projectId: project.id, surface: "web_viewer" } });

  const proto = h.get("x-forwarded-proto") ?? (env.isProd ? "https" : "http");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base = host ? `${proto}://${host}` : env.appUrl;
  const shareUrl = `${base}/v/${encodeURIComponent(slug)}?k=${encodeURIComponent(token)}`;
  const title = data.link.title || project.title;
  const cover = data.assets.find((a) => a.id === project.coverAssetId) ?? renders[0] ?? null;

  if (!glb) {
    // No 3D model yet: explain it plainly and show what does exist.
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <HtmlLang lang={locale} />
        {/* One recorder of "open_viewer" for the whole product; see OpenViewerBeacon. */}
        <OpenViewerBeacon slug={slug} token={token} model={false} />
        <TopBar title={title} code={project.code} backHref={backHref} backLabel={d.common.back} themeLabels={d.nav.theme} />
        <main className="flex-1">
          <div className="grid-paper border-b border-line">
            <div className="mx-auto w-full max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
              <div className="kicker">{project.code}</div>
              <h1 className="h-section mt-5 text-balance">{t.soonTitle}</h1>
              <p className="lead mx-auto mt-6 max-w-xl">{t.soonText}</p>
              <div className="mx-auto mt-9 h-px w-16 bg-line-strong" aria-hidden />
              <a href={backHref} className="btn-secondary btn-lg mt-9 min-h-[52px]">
                <ArrowLeft size={18} strokeWidth={1.5} aria-hidden />
                {t.backToProject}
              </a>
            </div>
          </div>
          {renders.length ? (
            <section className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
              <div className="mb-6 flex items-baseline gap-4 border-t border-line pt-6">
                <Index n={1} className="flex-none" />
                <h2 className="font-display text-[1.5rem] leading-tight font-medium text-fg sm:text-[1.75rem]">{d.portal.gallery}</h2>
              </div>
              <div>
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
        </main>
      </div>
    );
  }

  return (
    <>
      <HtmlLang lang={locale} />
      <OpenViewerBeacon slug={slug} token={token} model />
      <ViewerShell
        title={title}
        code={project.code}
        glbUrl={mediaUrl(glb.relPath)}
        iosSrc={usdz ? mediaUrl(usdz.relPath) : null}
        poster={cover ? mediaUrl(cover.thumbRelPath ?? cover.relPath, 960) : null}
        backHref={backHref}
        shareUrl={shareUrl}
        labels={{
          back: d.common.back,
          share: d.portal.share,
          copied: t.copied,
          hint: t.viewerHint,
          swatches: d.home.viewerSwatches,
          ar: d.home.viewerAr,
          reset: t.reset,
          alt: t.modelAlt,
          loading: t.viewerLoading,
          error: t.viewerError,
          retry: t.viewerRetry,
          theme: d.nav.theme,
        }}
      />
    </>
  );
}

/** The minimal brand shell used by every non-3D state of this route (same as /p). */
function StateShell({ locale, dict, brand, children }: { locale: Locale; dict: ReturnType<typeof getDictionary>; brand: BrandSettings; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <PortalChrome locale={locale} dict={dict} brand={brand}>
        {children}
      </PortalChrome>
    </div>
  );
}

/** Thin top bar used by the non-3D states of this route. */
function TopBar({ title, code, backHref, backLabel, themeLabels }: { title: string; code?: string | null; backHref: string; backLabel: string; themeLabels: { light: string; dark: string } }) {
  return (
    <header className="h-16 flex-none border-b border-line bg-surface">
      <div className="flex h-full items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <a href={backHref} className="btn-ghost btn-icon flex-none rounded-md" aria-label={backLabel}>
          <ArrowLeft size={18} strokeWidth={1.5} aria-hidden />
        </a>
        <BrandLogo className="h-6" />
        <div className="min-w-0 flex-1">
          {code ? <div className="caption truncate text-accent">{code}</div> : null}
          <span className="block truncate font-display text-[15px] leading-tight font-medium tracking-[-0.01em] text-fg sm:text-[17px]">{title}</span>
        </div>
        <ThemeToggle labels={themeLabels} className="flex-none" />
      </div>
    </header>
  );
}
