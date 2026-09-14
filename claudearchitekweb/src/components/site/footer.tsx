import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { localePath, pickLang, type Dictionary, type Locale } from "@/lib/i18n";
import type { BrandSettings } from "@/lib/settings";
import { BrandLogo } from "@/components/brand-logo";
import { telegramUrl, whatsappUrl } from "./contact-channels";

/**
 * Footer v3: a closing statement in serif, then an index of the site in mono-labelled columns,
 * then a hairline meta row. No boxes; rules and type carry the structure.
 * Phones get their own composition: a shorter statement, the contact rows (they are actions),
 * a two-column link matrix and social as one row — not the desktop columns stacked.
 */
export function SiteFooter({ locale, dict, brand }: { locale: Locale; dict: Dictionary; brand: BrandSettings }) {
  const p = (path: string) => localePath(locale, path);
  const cols = [
    {
      title: dict.siteNav.solutions,
      links: [[p("/platform"), dict.nav.kitchenpro], ...dict.siteNav.solutionsMenu.map((m) => [p(m.href), m.title] as [string, string])],
    },
    {
      title: dict.footer.company,
      links: [
        [p("/how-it-works"), dict.nav.howItWorks],
        [p("/portfolio"), dict.nav.portfolio],
        [p("/about"), dict.siteNav.about],
        [p("/faq"), dict.siteNav.faq],
        [p("/contact"), dict.nav.contact],
        [p("/privacy"), dict.footer.privacy],
      ],
    },
  ];
  const contacts = [
    [dict.common.telegram, brand.telegram, telegramUrl(brand.telegram)],
    [dict.common.whatsapp, brand.whatsapp, whatsappUrl(brand.whatsapp)],
    [dict.common.call, brand.phone, `tel:${brand.phone.replace(/[^\d+]/g, "")}`],
    [dict.common.email, brand.email, `mailto:${brand.email}`],
  ].filter(([, v]) => v);
  const socials = [
    ["Instagram", brand.instagram],
    ["Facebook", brand.facebook],
    ["LinkedIn", brand.linkedin],
    ["YouTube", brand.youtube],
  ].filter(([, url]) => url);

  return (
    <footer className="mt-20 border-t border-line-strong pb-16 sm:mt-24 md:pb-0">
      <div className="container-x">
        {/* Statement + contact */}
        <div className="grid gap-8 py-12 sm:py-14 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-7">
            <p className="font-display text-[1.45rem] leading-[1.2] text-fg sm:text-[2.2rem] sm:leading-[1.15]">{dict.footer.tagline}</p>
            <Link href={p("/start")} className="link-arrow mt-5 text-[15px] sm:mt-6">
              {dict.common.startProject}
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="lg:col-span-5 lg:pl-8">
            <div className="kicker">{dict.footer.contact}</div>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {contacts.map(([label, value, href]) => (
                <li key={label} className="contain-w flex items-baseline justify-between gap-4 py-2.5 text-[14px]">
                  <span className="caption">{label}</span>
                  <a href={href} className="min-w-0 truncate text-fg transition-colors hover:text-accent" target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                    {value}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-[13px] text-muted">
              <div>{String(pickLang(brand.address, locale, brand.address))}</div>
              <div>{String(pickLang(brand.workingHours, locale, brand.workingHours))}</div>
            </div>
          </div>
        </div>

        {/* Index: brand + two link columns (a 2-column matrix on phones) + social */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 border-t border-line py-9 md:grid-cols-12 md:gap-10 md:py-10">
          <div className="col-span-2 md:col-span-4">
            <BrandLogo className="h-7" />
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-muted">{dict.meta.description}</p>
          </div>
          {cols.map((c) => (
            <div key={c.title} className="md:col-span-3">
              <div className="kicker">{c.title}</div>
              <ul className="mt-3 space-y-2.5 text-[14px] md:space-y-2">
                {c.links.map(([href, label]) => (
                  <li key={href}>
                    <Link className="inline-block py-0.5 text-fg-2 transition-colors hover:text-fg" href={href}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="col-span-2 md:col-span-2">
            <div className="kicker">Social</div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[14px] md:block md:space-y-2">
              {socials.map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block py-0.5 text-fg-2 transition-colors hover:text-fg">
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-col items-start justify-between gap-2 border-t border-line py-5 font-mono text-[11px] tracking-[0.04em] text-muted sm:flex-row sm:items-center">
          <div>
            © {new Date().getFullYear()} {brand.name} · {dict.footer.rights}
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">Yerevan · 3D · AR · Web Viewer</span>
            <Link href="/admin" className="transition-colors hover:text-fg">
              {dict.footer.admin}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
