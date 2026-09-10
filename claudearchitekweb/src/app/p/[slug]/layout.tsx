import { getDictionary, isLocale, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { getShareLinkBySlug } from "@/lib/portal";
import { HtmlLang } from "@/components/site/html-lang";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const link = getShareLinkBySlug(slug);
  const locale: Locale = isLocale(link?.language) ? link!.language : "hy";
  const dict = getDictionary(locale);
  const brand = getSetting("brand");
  const year = new Date().getFullYear();

  return (
    <>
      <HtmlLang lang={locale} />
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
          <a href={brand.website || "/"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5" aria-label={brand.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt={brand.name} className="h-7 w-auto" />
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-medium text-ink-500 sm:inline">{brand.tagline}</span>
            <span className="badge border-ink-200 bg-white text-ink-700">{LOCALE_LABELS[locale].short}</span>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-ink-500 sm:flex-row sm:px-8">
          <span>{dict.portal.poweredBy}</span>
          <span>
            © {year} {brand.name}
            {brand.website ? (
              <>
                {" · "}
                <a href={brand.website} target="_blank" rel="noopener noreferrer" className="hover:text-ink-900">
                  {brand.website.replace(/^https?:\/\//, "")}
                </a>
              </>
            ) : null}
          </span>
        </div>
      </footer>
    </>
  );
}
