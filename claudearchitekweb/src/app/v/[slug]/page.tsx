import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { mediaSrcSet, mediaUrl } from "@/lib/media";
import { track } from "@/lib/analytics";
import { env } from "@/lib/env";
import { checkAccess, getPortalData, getShareLinkBySlug, passcodeCookieName, recordEvent, recordView } from "@/lib/portal";
import { ContactChannels } from "@/components/site/contact-channels";
import { HtmlLang } from "@/components/site/html-lang";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { Index } from "@/components/ui";
import { Gallery } from "@/components/portal/gallery";
import { PasscodeForm } from "@/components/portal/passcode-form";
import { ViewerShell } from "@/components/portal/viewer-shell";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

/** Strings specific to this route (the shared dictionary carries the rest). */
const LOCAL: Record<Locale, { copied: string; reset: string; soonTitle: string; soonText: string; backToProject: string }> = {
  hy: {
    copied: "Պատճենվեց",
    reset: "Վերականգնել դիտումը",
    soonTitle: "Web Viewer-ը շուտով պատրաստ կլինի",
    soonText: "3D մոդելը դեռ պատրաստվում է։ Հենց պատրաստ լինի, այս էջը կբացվի ինտերակտիվ 3D-ով՝ նույն հղումով։ Այժմ կարող եք դիտել պատրաստի պատկերները։",
    backToProject: "Վերադառնալ նախագծին",
  },
  ru: {
    copied: "Скопировано",
    reset: "Сбросить вид",
    soonTitle: "Web Viewer скоро будет готов",
    soonText: "3D-модель ещё готовится. Как только она будет готова, эта страница откроется в интерактивном 3D по той же ссылке. Пока посмотрите готовые изображения.",
    backToProject: "Вернуться к проекту",
  },
  en: {
    copied: "Copied",
    reset: "Reset the view",
    soonTitle: "The Web Viewer will appear here soon",
    soonText: "The 3D model is still being prepared. As soon as it is ready this page opens in interactive 3D under the same link. In the meantime, here are the finished images.",
    backToProject: "Back to the project",
  },
};

function firstParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const [{ slug }, sp, cookieStore] = await Promise.all([params, searchParams, cookies()]);
  const link = getShareLinkBySlug(slug);
  // Same rule as /p: never leak the project name to someone who guessed a slug.
  const access = checkAccess(link, firstParam(sp.k) ?? "", link ? cookieStore.get(passcodeCookieName(link.id))?.value : null);
  const title = access === "ok" && link?.title ? `${link.title} — 3D — ArchiTek Soft` : "ArchiTek Soft";
  return { title, robots: { index: false, follow: false } };
}

export default async function ProjectViewerPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [{ slug }, sp, cookieStore, h] = await Promise.all([params, searchParams, cookies(), headers()]);
  const token = firstParam(sp.k) ?? "";
  const link = getShareLinkBySlug(slug);
  const locale: Locale = isLocale(link?.language) ? link!.language : "hy";
  const d = getDictionary(locale);
  const t = LOCAL[locale];
  const brand = getSetting("brand");

  const access = checkAccess(link, token, link ? cookieStore.get(passcodeCookieName(link.id))?.value : null);

  if (access === "not_found" || access === "bad_token") return <StateShell locale={locale} title={d.portal.notFound} brand={brand} dict={d} />;
  if (access === "expired" || access === "inactive") return <StateShell locale={locale} title={d.portal.expired} brand={brand} dict={d} />;
  if (access === "passcode") {
    return (
      <div className="flex min-h-dvh flex-col justify-center bg-bg">
        <HtmlLang lang={locale} />
        <div className="flex w-full flex-1 items-center px-5 py-16 sm:px-8">
          <PasscodeForm slug={slug} token={token} labels={{ title: d.portal.passcodeTitle, text: d.portal.passcodeText, button: d.portal.passcodeButton, wrong: d.portal.passcodeWrong }} />
        </div>
      </div>
    );
  }

  const data = getPortalData(slug);
  if (!data) return <StateShell locale={locale} title={d.portal.notFound} brand={brand} dict={d} />;
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
  const backHref = `/p/${encodeURIComponent(slug)}?k=${encodeURIComponent(token)}`;
  const shareUrl = `${base}/v/${encodeURIComponent(slug)}?k=${encodeURIComponent(token)}`;
  const title = data.link.title || project.title;
  const cover = data.assets.find((a) => a.id === project.coverAssetId) ?? renders[0] ?? null;

  if (!glb) {
    // No 3D model yet: explain it plainly and show what does exist.
    try {
      recordEvent(data.link.id, "open_viewer", { surface: "web_viewer", model: false }, { ip, ua });
    } catch {
      /* best effort */
    }
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <HtmlLang lang={locale} />
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
      <ViewerShell
        slug={slug}
        token={token}
        title={title}
        code={project.code}
        logoSrc="/brand/logo.png"
        glbUrl={mediaUrl(glb.relPath)}
        iosSrc={usdz ? mediaUrl(usdz.relPath) : null}
        poster={cover ? mediaUrl(cover.thumbRelPath ?? cover.relPath, 960) : null}
        backHref={backHref}
        shareUrl={shareUrl}
        labels={{
          back: d.common.back,
          share: d.portal.share,
          copied: t.copied,
          hint: d.home.viewerHint,
          swatches: d.home.viewerSwatches,
          ar: d.home.viewerAr,
          reset: t.reset,
          theme: d.nav.theme,
        }}
      />
    </>
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

/** Not found / expired: a centred typographic message on grid paper. */
function StateShell({ locale, title, brand, dict }: { locale: Locale; title: string; brand: ReturnType<typeof getSetting<"brand">>; dict: ReturnType<typeof getDictionary> }) {
  return (
    <div className="grid-paper flex min-h-dvh flex-col justify-center bg-bg">
      <HtmlLang lang={locale} />
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
