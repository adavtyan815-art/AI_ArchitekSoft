import { headers } from "next/headers";
import { DEFAULT_LOCALE, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { NotFoundView } from "@/components/site/not-found-view";

/**
 * `notFound()` raised from inside a site page — an unknown portfolio slug, say. The header and
 * footer are already on screen (this boundary sits under the (site)/[locale] layout), so only the
 * body is rendered here. A boundary has no `params`, so the language comes from the middleware's
 * `x-locale` header, exactly as in src/app/not-found.tsx.
 */
export default async function LocaleNotFound() {
  const h = await headers();
  const raw = h.get("x-locale");
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  return <NotFoundView locale={locale} dict={getDictionary(locale)} />;
}
