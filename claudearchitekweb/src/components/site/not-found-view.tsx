import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { localePath, type Dictionary, type Locale } from "@/lib/i18n";
import { Index, Ticks } from "@/components/ui";

/**
 * The body of the public 404, shared by the two boundaries that can show it:
 *  - src/app/not-found.tsx — an address that matches no route at all; it brings the site chrome
 *    with it, because an unmatched URL never reaches the (site)/[locale] layout;
 *  - src/app/(site)/[locale]/not-found.tsx — `notFound()` from inside a site page (an unknown
 *    portfolio slug, say), where the header and footer are already on screen.
 * Same rhythm as every other page: eyebrow, serif headline, lead, then a hairline index of the
 * places worth going instead.
 */
export function NotFoundView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const p = (path: string) => localePath(locale, path);
  const links: [string, string][] = [
    [p("/"), dict.notFound.home],
    [p("/portfolio"), dict.nav.portfolio],
    [p("/how-it-works"), dict.nav.howItWorks],
    [p("/platform"), dict.nav.kitchenpro],
    [p("/contact"), dict.nav.contact],
  ];

  return (
    <section className="container-narrow pt-10 pb-16 sm:pt-16 sm:pb-24">
      <div className="mb-6 flex items-center gap-3">
        <Index n={4} />
        <span className="eyebrow">{dict.notFound.code}</span>
      </div>
      <h1 className="font-display text-[2.1rem] leading-[1.05] font-medium tracking-[-0.02em] text-fg sm:text-[3rem]">{dict.notFound.title}</h1>
      <p className="lead mt-6">{dict.notFound.text}</p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link href={p("/")} className="btn-primary">
          {dict.notFound.home}
        </Link>
        <Link href={p("/start")} className="btn-secondary">
          {dict.common.startProject}
        </Link>
      </div>

      <div className="mt-14 sm:mt-20">
        <Ticks />
      </div>
      <div className="kicker mt-6">{dict.notFound.links}</div>
      <ul className="mt-2">
        {links.map(([href, label]) => (
          <li key={href} className="border-b border-line">
            <Link href={href} className="flex min-h-12 items-center justify-between gap-4 py-2 text-[15.5px] text-fg-2 transition-colors hover:text-fg">
              {label}
              <ArrowUpRight size={16} aria-hidden className="flex-none opacity-60" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
