import type { ReactNode } from "react";
import { LOCALE_LABELS, type Dictionary, type Locale } from "@/lib/i18n";
import type { BrandSettings } from "@/lib/settings";
import { cn, yerevanYear } from "@/lib/utils";
import { HtmlLang } from "@/components/site/html-lang";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { ContactChannels } from "@/components/site/contact-channels";

/** The tagline only when Settings stores it per language and has one for this page's language. */
function localTagline(raw: string | null | undefined, locale: Locale): string | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as unknown;
    if (obj && typeof obj === "object") {
      const v = (obj as Record<string, unknown>)[locale];
      return typeof v === "string" && v.trim() ? v.trim() : null;
    }
  } catch {
    /* a plain string has no language: showing it on a language-tagged client page reads as unfinished */
  }
  return null;
}

/**
 * The minimal brand shell of every client page state on /p and /v: a thin brand
 * bar, the content and a footer. The pages render it themselves (not the segment
 * layout) because only the page knows whether the visitor may see the link's
 * language: layouts never receive the ?k= key.
 */
export function PortalChrome({
  locale,
  dict,
  brand,
  stickyBar = false,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  brand: BrandSettings;
  /** The phone action bar is rendered on this page: keep the footer clear of it. */
  stickyBar?: boolean;
  children: ReactNode;
}) {
  const year = yerevanYear();
  const tagline = localTagline(brand.tagline, locale);

  return (
    <>
      <HtmlLang lang={locale} />
      <header id="top" className="glass sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-5 sm:px-8">
          {/* Not a link: on a private client page the logo must not take the client to the marketing site. */}
          <span className="flex shrink-0 items-center gap-2.5">
            <BrandLogo className="h-7" alt={brand.name || "ArchiTek Soft"} />
          </span>
          <div className="flex min-w-0 items-center gap-3">
            {tagline ? <span className="caption hidden max-w-[22rem] truncate sm:inline">{tagline}</span> : null}
            <span className="tag flex-none">{LOCALE_LABELS[locale].short}</span>
            <ThemeToggle labels={dict.nav.theme} className="flex-none" />
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className={cn("border-t border-line", stickyBar && "max-lg:pb-[calc(4.75rem+env(safe-area-inset-bottom))]")}>
        <div className="caption mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-5 py-6 sm:flex-row sm:px-8">
          <span>{dict.portal.poweredBy}</span>
          <span>
            © {year} {brand.name}
            {brand.website ? (
              <>
                {" · "}
                <a href={brand.website} target="_blank" rel="noopener noreferrer" className="-my-3 inline-block py-3 transition-colors hover:text-fg">
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

/** Not found / expired / switched off: a centred typographic message on grid paper with the ways to reach the studio. */
export function PortalState({ title, dict, brand }: { title: string; dict: Dictionary; brand: BrandSettings }) {
  return (
    <div className="grid-paper flex flex-1 items-center">
      <div className="mx-auto w-full max-w-md px-5 py-16 text-center sm:px-8">
        <div className="kicker">{brand.name || "ArchiTek Soft"}</div>
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
