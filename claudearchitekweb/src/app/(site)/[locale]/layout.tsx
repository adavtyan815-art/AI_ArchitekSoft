import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getDictionary, isLocale, LOCALES, localePath } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Track } from "@/components/site/track";
import { MobileCta } from "@/components/site/mobile-cta";
import { telegramUrl } from "@/components/site/contact-channels";
import { RevealObserver } from "@/components/reveal";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: { default: dict.meta.title, template: "%s — ArchiTek Soft" },
    description: dict.meta.description,
    alternates: { canonical: localePath(locale, "/"), languages: Object.fromEntries(LOCALES.map((l) => [l, localePath(l, "/")])) },
    openGraph: { title: dict.meta.title, description: dict.meta.description, locale, type: "website", siteName: "ArchiTek Soft", images: ["/brand/share.jpg"] },
    twitter: { card: "summary_large_image", title: dict.meta.title, description: dict.meta.description, images: ["/brand/share.jpg"] },
  };
}

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const brand = getSetting("brand");
  const nav = { kitchenpro: dict.nav.kitchenpro, howItWorks: dict.nav.howItWorks, portfolio: dict.nav.portfolio, contact: dict.nav.contact, start: dict.nav.start, menu: dict.nav.menu, theme: dict.nav.theme, solutions: dict.siteNav.solutions, about: dict.siteNav.about, faq: dict.siteNav.faq, solutionsMenu: dict.siteNav.solutionsMenu };
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} nav={nav} />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} dict={dict} brand={brand} />
      <MobileCta startHref={localePath(locale, "/start")} startLabel={dict.nav.start} telegramUrl={telegramUrl(brand.telegram)} telegramLabel={dict.common.telegram} />
      <Suspense fallback={null}>
        <Track locale={locale} />
      </Suspense>
      <RevealObserver />
    </div>
  );
}
