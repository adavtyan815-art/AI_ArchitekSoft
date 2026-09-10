"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { LOCALES, LOCALE_LABELS, localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export type HeaderNav = {
  kitchenpro: string;
  business: string;
  home: string;
  viewer: string;
  solutions: string;
  portfolio: string;
  howItWorks: string;
  contact: string;
  start: string;
  menu: string;
  theme: { light: string; dark: string };
};

/** Site header: compact, glassy on scroll, full-screen sheet menu on mobile. Receives only the strings it needs. */
export function SiteHeader({ locale, nav }: { locale: Locale; nav: HeaderNav }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const bare = pathname.replace(/^\/(ru|en)(?=\/|$)/, "") || "/";
  const p = (path: string) => localePath(locale, path);
  const primary = [
    { href: p("/kitchenpro"), label: nav.kitchenpro },
    { href: p("/for-business"), label: nav.business },
    { href: p("/for-home"), label: nav.home },
    { href: p("/viewer"), label: nav.viewer },
    { href: p("/portfolio"), label: nav.portfolio },
    { href: p("/contact"), label: nav.contact },
  ];
  const secondary = [
    { href: p("/how-it-works"), label: nav.howItWorks },
    { href: p("/solutions"), label: nav.solutions },
  ];
  const isActive = (href: string) => pathname === href || (href !== p("/") && pathname.startsWith(href));

  return (
    <>
      <header className={cn("sticky top-0 z-40 transition-[background-color,border-color] duration-200", scrolled ? "glass border-b border-line" : "border-b border-transparent bg-bg")}>
        <div className="container-x flex h-16 items-center justify-between gap-4 lg:h-[72px]">
          <Link href={p("/")} className="flex shrink-0 items-center" aria-label="ArchiTek Soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="ArchiTek Soft" width={125} height={40} className="h-7 w-auto dark:brightness-[1.35]" />
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            {primary.map((n) => (
              <Link key={n.href} href={n.href} className={cn("rounded-full px-3 py-1.5 text-[13.5px] font-medium whitespace-nowrap transition-colors", isActive(n.href) ? "bg-surface-2 text-fg" : "text-fg-2 hover:bg-surface-2 hover:text-fg")}>
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <div className="hidden items-center rounded-full border border-line bg-surface p-0.5 text-[11px] font-semibold md:flex">
              {LOCALES.map((l) => (
                <Link key={l} href={localePath(l, bare)} className={cn("rounded-full px-2.5 py-1 transition-colors", l === locale ? "bg-fg text-bg" : "text-muted hover:text-fg")} aria-label={LOCALE_LABELS[l].name}>
                  {LOCALE_LABELS[l].short}
                </Link>
              ))}
            </div>
            <ThemeToggle labels={nav.theme} />
            <Link href={p("/start")} className="btn-primary hidden md:inline-flex">
              {nav.start}
              <ArrowUpRight size={16} />
            </Link>
            <button className="btn-ghost btn-icon lg:hidden" onClick={() => setOpen((o) => !o)} aria-label={nav.menu} aria-expanded={open} aria-controls="mobile-menu">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <div id="mobile-menu" className={cn("fixed inset-0 z-50 flex flex-col bg-bg transition-opacity duration-200 lg:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={!open}>
        <div className="container-x flex h-16 items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="ArchiTek Soft" width={125} height={40} className="h-7 w-auto dark:brightness-[1.35]" />
          <button className="btn-ghost btn-icon" onClick={() => setOpen(false)} aria-label={nav.menu}>
            <X size={22} />
          </button>
        </div>
        <nav className="container-x flex flex-1 flex-col gap-1 overflow-y-auto py-2" aria-label="Mobile">
          {primary.map((n) => (
            <Link key={n.href} href={n.href} className={cn("flex items-center justify-between rounded-2xl px-4 py-3.5 font-display text-xl font-semibold", isActive(n.href) ? "bg-surface-2 text-fg" : "text-fg")}>
              {n.label}
              <ArrowUpRight size={18} className="text-faint" />
            </Link>
          ))}
          <div className="my-2 hairline" />
          {secondary.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-2xl px-4 py-2.5 text-base font-medium text-fg-2">
              {n.label}
            </Link>
          ))}
          <div className="mt-4 flex items-center gap-2 px-4">
            {LOCALES.map((l) => (
              <Link key={l} href={localePath(l, bare)} className={cn("rounded-full border px-3.5 py-1.5 text-xs font-semibold", l === locale ? "border-fg bg-fg text-bg" : "border-line text-fg-2")}>
                {LOCALE_LABELS[l].short}
              </Link>
            ))}
          </div>
        </nav>
        <div className="container-x pb-safe pt-3">
          <Link href={p("/start")} className="btn-primary btn-lg w-full">
            {nav.start}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </>
  );
}
