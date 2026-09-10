import { getDictionary, isLocale, LOCALE_LABELS, pickLang, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { getShareLinkBySlug } from "@/lib/portal";
import { HtmlLang } from "@/components/site/html-lang";
import { ThemeToggle } from "@/components/theme-toggle";

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
      <header className="glass sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-5 sm:px-8">
          <a href={brand.website || "/"} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-2.5" aria-label={brand.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt={brand.name} className="h-7 w-auto dark:brightness-[1.35]" />
          </a>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[22rem] truncate text-xs font-medium text-muted sm:inline">{pickLang(brand.tagline, locale, brand.tagline)}</span>
            <span className="badge border-line bg-surface-2 text-fg-2">{LOCALE_LABELS[locale].short}</span>
            <ThemeToggle labels={dict.nav.theme} />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-muted sm:flex-row sm:px-8">
          <span>{dict.portal.poweredBy}</span>
          <span>
            © {year} {brand.name}
            {brand.website ? (
              <>
                {" · "}
                <a href={brand.website} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-fg">
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
