import { headers } from "next/headers";
import type { Metadata } from "next";
import { DEFAULT_LOCALE, getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { MobileCta } from "@/components/site/mobile-cta";
import { telegramUrl } from "@/components/site/contact-channels";
import { Ambient } from "@/components/site/ambient";
import { NotFoundView } from "@/components/site/not-found-view";

/**
 * The answer for an address that matches no route in the app.
 *
 * Next renders this file *outside* the (site)/[locale] tree — an unmatched URL never reaches that
 * layout — so the site chrome is brought along here. The language comes from `x-locale`, the header
 * the middleware sets from the URL (`/qa-x` → hy, `/ru/qa-x` → ru), which is the same value the root
 * layout uses for `<html lang>`; the two can therefore never disagree.
 *
 * A mistyped /admin URL never reaches this file: src/app/admin/(shell)/[...unknown] catches those
 * inside the admin shell. /p and /v answer their own 404 for a slug that does not open.
 */
/**
 * No `robots` here: Next already renders `<meta name="robots" content="noindex">` for a not-found
 * render, and a second copy of our own would put two of them in the same document. `nofollow` would
 * be wrong anyway — the way out of this page is a list of links we do want followed.
 */
export const metadata: Metadata = { title: "404 — ArchiTek Soft" };

export default async function SiteNotFound() {
  const h = await headers();
  const raw = h.get("x-locale");
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const dict = getDictionary(locale);
  const brand = getSetting("brand");
  const nav = { kitchenpro: dict.nav.kitchenpro, howItWorks: dict.nav.howItWorks, portfolio: dict.nav.portfolio, contact: dict.nav.contact, start: dict.nav.start, menu: dict.nav.menu, theme: dict.nav.theme, solutions: dict.siteNav.solutions, about: dict.siteNav.about, faq: dict.siteNav.faq, solutionsMenu: dict.siteNav.solutionsMenu };

  return (
    <div className="site-shell flex min-h-screen flex-col">
      <Ambient />
      <SiteHeader locale={locale} nav={nav} />
      <main className="flex-1">
        <NotFoundView locale={locale} dict={dict} />
      </main>
      <SiteFooter locale={locale} dict={dict} brand={brand} />
      <MobileCta startHref={localePath(locale, "/start")} startLabel={dict.nav.start} telegramUrl={telegramUrl(brand.telegram)} telegramLabel={dict.common.telegram} />
    </div>
  );
}
