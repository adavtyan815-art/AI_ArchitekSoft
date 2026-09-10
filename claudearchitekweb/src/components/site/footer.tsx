import Link from "next/link";
import { localePath, pickLang, type Dictionary, type Locale } from "@/lib/i18n";
import type { BrandSettings } from "@/lib/settings";
import { ContactChannels } from "./contact-channels";

export function SiteFooter({ locale, dict, brand }: { locale: Locale; dict: Dictionary; brand: BrandSettings }) {
  const p = (path: string) => localePath(locale, path);
  const cols = [
    {
      title: dict.footer.product,
      links: [
        [p("/kitchenpro"), dict.nav.kitchenpro],
        [p("/for-business"), dict.nav.business],
        [p("/for-home"), dict.nav.home],
        [p("/viewer"), dict.nav.viewer],
        [p("/solutions"), dict.nav.solutions],
      ],
    },
    {
      title: dict.footer.company,
      links: [
        [p("/how-it-works"), dict.nav.howItWorks],
        [p("/portfolio"), dict.nav.portfolio],
        [p("/contact"), dict.nav.contact],
        [p("/privacy"), dict.footer.privacy],
      ],
    },
  ];
  const socials = [
    ["Instagram", brand.instagram],
    ["Facebook", brand.facebook],
    ["LinkedIn", brand.linkedin],
    ["YouTube", brand.youtube],
  ].filter(([, url]) => url);

  return (
    <footer className="mt-24 border-t border-line bg-surface-2/60 pb-20 md:pb-0">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr_1.3fr] lg:py-20">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="ArchiTek Soft" width={125} height={40} className="h-7 w-auto dark:brightness-[1.35]" />
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-muted">{dict.footer.tagline}</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <div className="kicker">{c.title}</div>
            <ul className="mt-4 space-y-2.5 text-[15px]">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link className="text-fg-2 transition-colors hover:text-fg" href={href}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <div className="kicker">{dict.footer.contact}</div>
          <div className="mt-4">
            <ContactChannels brand={brand} dict={dict} compact />
          </div>
          <div className="mt-5 text-sm text-muted">
            <div>{String(pickLang(brand.address, locale, brand.address))}</div>
            <div>{String(pickLang(brand.workingHours, locale, brand.workingHours))}</div>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col items-start justify-between gap-3 py-5 text-xs text-muted sm:flex-row sm:items-center">
          <div>
            © {new Date().getFullYear()} {brand.name}. {dict.footer.rights}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {socials.map(([name, url]) => (
              <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-fg">
                {name}
              </a>
            ))}
            <Link href="/admin" className="transition-colors hover:text-fg">
              {dict.footer.admin}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
