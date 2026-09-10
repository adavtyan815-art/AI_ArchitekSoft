import Link from "next/link";
import { localePath, pickLang, type Dictionary, type Locale } from "@/lib/i18n";
import type { BrandSettings } from "@/lib/settings";
import { ContactChannels } from "./contact-channels";

export function SiteFooter({ locale, dict, brand }: { locale: Locale; dict: Dictionary; brand: BrandSettings }) {
  const p = (path: string) => localePath(locale, path);
  return (
    <footer className="mt-24 border-t border-line bg-paper-2">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="ArchiTek Soft" className="h-7 w-auto" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-600">{dict.footer.tagline}</p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">{dict.footer.product}</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="text-ink-700 hover:text-ink-950" href={p("/kitchenpro")}>{dict.nav.kitchenpro}</Link></li>
            <li><Link className="text-ink-700 hover:text-ink-950" href={p("/for-business")}>{dict.nav.business}</Link></li>
            <li><Link className="text-ink-700 hover:text-ink-950" href={p("/for-home")}>{dict.nav.home}</Link></li>
            <li><Link className="text-ink-700 hover:text-ink-950" href={p("/solutions")}>{dict.nav.solutions}</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">{dict.footer.company}</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="text-ink-700 hover:text-ink-950" href={p("/how-it-works")}>{dict.nav.howItWorks}</Link></li>
            <li><Link className="text-ink-700 hover:text-ink-950" href={p("/portfolio")}>{dict.nav.portfolio}</Link></li>
            <li><Link className="text-ink-700 hover:text-ink-950" href={p("/contact")}>{dict.nav.contact}</Link></li>
            <li><Link className="text-ink-700 hover:text-ink-950" href={p("/privacy")}>{dict.footer.privacy}</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">{dict.footer.contact}</div>
          <div className="mt-3">
            <ContactChannels brand={brand} dict={dict} compact />
          </div>
          <div className="mt-4 text-sm text-ink-600">
            <div>{pickLang(brand.address, locale, brand.address)}</div>
            <div>{pickLang(brand.workingHours, locale, brand.workingHours)}</div>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col items-start justify-between gap-3 py-5 text-xs text-ink-500 sm:flex-row sm:items-center">
          <div>© {new Date().getFullYear()} {brand.name}. {dict.footer.rights}</div>
          <div className="flex items-center gap-4">
            {[
              ["Instagram", brand.instagram],
              ["Facebook", brand.facebook],
              ["LinkedIn", brand.linkedin],
              ["YouTube", brand.youtube],
            ]
              .filter(([, url]) => url)
              .map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="hover:text-ink-900">
                  {name}
                </a>
              ))}
            <Link href="/admin" className="hover:text-ink-900">{dict.footer.admin}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
