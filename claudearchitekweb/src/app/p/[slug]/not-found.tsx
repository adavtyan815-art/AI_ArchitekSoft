import { headers } from "next/headers";
import { getDictionary } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { PortalChrome, PortalState } from "@/components/portal/chrome";
import { localeFromAcceptLanguage } from "@/components/portal/strings";

/**
 * Answer for every client-page address the visitor has not proved they may open:
 * an unknown slug and a wrong key are one and the same 404, in the visitor's own
 * browser language, so an existing link cannot be told apart from an invented one.
 */
export default async function PortalNotFound() {
  const h = await headers();
  const locale = localeFromAcceptLanguage(h.get("accept-language"));
  const dict = getDictionary(locale);
  const brand = getSetting("brand");

  return (
    <PortalChrome locale={locale} dict={dict} brand={brand}>
      <PortalState title={dict.portal.notFound} dict={dict} brand={brand} />
    </PortalChrome>
  );
}
