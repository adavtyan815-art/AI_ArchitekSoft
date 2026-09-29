import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone, Send, type LucideIcon } from "lucide-react";
import { localePath, type Dictionary, type Locale } from "@/lib/i18n";
import { localizeBrandText } from "@/lib/brand-text";
import type { BrandSettings } from "@/lib/settings";
import { BrandLogo } from "@/components/brand-logo";
import { telegramUrl, whatsappUrl } from "./contact-channels";

type ContactRow = { key: string; label: string; value: string; href?: string; Icon: LucideIcon };

/** "Vanadzor, Armenia" → "ք. Վանաձոր" / "г. Ванадзор" / "Vanadzor": the city, as a footer line reads it. */
const CITY_PREFIX: Record<Locale, string> = { hy: "ք. ", ru: "г. ", en: "" };
function cityOf(address: string, locale: Locale): string {
  const city = address.split(",")[0].trim();
  const prefix = CITY_PREFIX[locale];
  return city && prefix && !city.startsWith(prefix.trim()) ? prefix + city : city;
}

/**
 * Footer v5: one index row, then a hairline meta row. No statement and no separate contact band: the closing band above
 * makes the pitch, and the direct contacts live in the first column under the logo.
 * Four columns from lg (tablets: the brand block across the row, its contacts in two columns, the three link columns
 * beneath): brand (logo + phone, e-mail, Telegram, WhatsApp, city · hours) | Solutions | Company | Social.
 * The brand column is laid out on the link columns' own rhythm — the logo on the headings' line, then rows of the same
 * height as the links, bottom-aligned — so each contact sits level with a link and every column ends on one line.
 * Phones: the contact rows first (each a full-width 40px tap target), then a two-column link matrix, social as a row.
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
  const address = localizeBrandText(brand.address, locale);
  const hours = localizeBrandText(brand.workingHours, locale);
  const where = [address ? cityOf(address, locale) : "", hours].filter(Boolean).join(" · ");
  const contacts = (
    [
      { key: "phone", label: dict.common.call, value: brand.phone, href: `tel:${brand.phone.replace(/[^\d+]/g, "")}`, Icon: Phone },
      { key: "email", label: dict.common.email, value: brand.email, href: `mailto:${brand.email}`, Icon: Mail },
      { key: "telegram", label: dict.common.telegram, value: brand.telegram, href: telegramUrl(brand.telegram), Icon: Send },
      { key: "whatsapp", label: dict.common.whatsapp, value: brand.whatsapp, href: whatsappUrl(brand.whatsapp), Icon: MessageCircle },
      { key: "where", label: [dict.contact.addressLabel, dict.contact.hoursLabel].join(" · "), value: where, Icon: MapPin },
    ] satisfies ContactRow[]
  ).filter((c) => c.value);
  const socials = [
    ["Instagram", brand.instagram],
    ["Facebook", brand.facebook],
    ["LinkedIn", brand.linkedin],
    ["YouTube", brand.youtube],
  ].filter(([, url]) => url);
  /** A footer row: 40px tap target on phones, the links' own type-led height from md. */
  const row = "flex min-h-10 min-w-0 items-center gap-2.5 text-fg-2 transition-colors md:min-h-0 md:py-0.5";

  return (
    <footer className="mt-20 border-t border-line-strong pb-16 sm:mt-24 md:pb-0">
      <div className="container-x">
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 py-10 md:grid-cols-12 md:gap-10 md:py-12 lg:py-14">
          {/* Brand: the logo on the headings' line, the direct contacts on the link rows' rhythm, bottom-aligned */}
          <div className="col-span-2 md:col-span-12 lg:col-span-4 lg:flex lg:flex-col lg:justify-between lg:gap-6">
            <div className="hidden md:mb-5 md:block lg:mb-0">
              {/* +2px: the wordmark's ink then starts on the column headings' cap line (the PNG has ~2.7px of
                  transparent top padding at this size; the headings' caps sit ~4.5px into their line box) */}
              <BrandLogo className="footer-logo mt-0.5 h-8" />
            </div>
            <ul className="space-y-0 text-[14px] md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-2 lg:block lg:space-y-2" aria-label={dict.footer.contact}>
              {contacts.map(({ key, label, value, href, Icon }) => {
                const body = (
                  <>
                    <Icon size={15} strokeWidth={1.7} className="flex-none text-faint" aria-hidden />
                    <span className="truncate">{value}</span>
                  </>
                );
                return (
                  <li key={key}>
                    {href ? (
                      <a href={href} className={`${row} hover:text-fg`} aria-label={`${label}: ${value}`} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                        {body}
                      </a>
                    ) : (
                      <span className={row} title={`${label}: ${value}`}>
                        {body}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          {cols.map((c) => (
            <div key={c.title} className="md:col-span-4 lg:col-span-3">
              <div className="kicker">{c.title}</div>
              {/* Phones: each link is a full-width 40px row (the rows sit tight, so the column keeps
                  its height). From md the pointer is a mouse again and the type-led spacing returns. */}
              <ul className="mt-2 space-y-0 text-[14px] md:mt-3 md:space-y-2">
                {c.links.map(([href, label]) => (
                  <li key={href}>
                    <Link className="flex min-h-10 items-center text-fg-2 transition-colors hover:text-fg md:inline-flex md:min-h-0 md:py-0.5" href={href}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="col-span-2 md:col-span-4 lg:col-span-2">
            <div className="kicker">{dict.footer.social}</div>
            <ul className="mt-2 flex flex-wrap gap-x-5 text-[14px] md:mt-3 md:block md:space-y-2">
              {socials.map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center text-fg-2 transition-colors hover:text-fg md:inline-flex md:min-h-0 md:py-0.5">
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-col items-start justify-between gap-3 border-t border-line py-5 font-mono text-[11px] leading-relaxed tracking-[0.04em] text-muted sm:flex-row sm:items-center sm:gap-2">
          <div>
            <span className="block sm:inline">
              © {new Date().getFullYear()} {brand.name}
            </span>{" "}
            <span className="block sm:inline">· {dict.footer.rights}</span>
          </div>
          <span className="hidden sm:inline">{dict.footer.meta}</span>
        </div>
      </div>
    </footer>
  );
}
