import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDictionary, isLocale, LOCALES, localePath } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Track } from "@/components/site/track";
import { HtmlLang } from "@/components/site/html-lang";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: { default: dict.meta.title, template: "%s — ArchiTek Soft" },
    description: dict.meta.description,
    alternates: { canonical: localePath(locale, "/"), languages: Object.fromEntries(LOCALES.map((l) => [l, localePath(l, "/")])) },
    // A nested `openGraph` replaces this object wholesale, so every page that
    // sets its own must repeat siteName/images (see ./meta.ts).
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      url: localePath(locale, "/"),
      siteName: "ArchiTek Soft",
      locale,
      type: "website",
      images: ["/brand/share.jpg"],
    },
    twitter: { card: "summary_large_image", title: dict.meta.title, description: dict.meta.description, images: ["/brand/share.jpg"] },
  };
}

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const brand = getSetting("brand");
  return (
    <div className="flex min-h-screen flex-col">
      <HtmlLang lang={locale} />
      <SiteHeader locale={locale} dict={dict} />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} dict={dict} brand={brand} />
      <Suspense fallback={null}>
        <Track locale={locale} />
      </Suspense>
    </div>
  );
}
