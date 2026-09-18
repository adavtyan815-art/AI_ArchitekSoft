import { headers } from "next/headers";
import { getDictionary } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { PortalChrome, PortalState } from "@/components/portal/chrome";
import { localeFromAcceptLanguage } from "@/components/portal/strings";

/**
 * Same 404 as /p for every viewer address the visitor may not open: an unknown slug
 * and a wrong key are indistinguishable, and the page speaks the visitor's language.
 */
export default async function ViewerNotFound() {
  const h = await headers();
  const locale = localeFromAcceptLanguage(h.get("accept-language"));
  const dict = getDictionary(locale);
  const brand = getSetting("brand");

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <PortalChrome locale={locale} dict={dict} brand={brand}>
        <PortalState title={dict.portal.notFound} dict={dict} brand={brand} />
      </PortalChrome>
    </div>
  );
}
