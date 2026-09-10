"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { LOCALES, LOCALE_LABELS, localePath, type Dictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  // path without locale prefix, for the language switcher
  const bare = pathname.replace(/^\/(ru|en)(?=\/|$)/, "") || "/";
  const p = (path: string) => localePath(locale, path);
  const nav = [
    { href: p("/kitchenpro"), label: dict.nav.kitchenpro },
    { href: p("/for-business"), label: dict.nav.business },
    { href: p("/for-home"), label: dict.nav.home },
    { href: p("/solutions"), label: dict.nav.solutions },
    { href: p("/portfolio"), label: dict.nav.portfolio },
    { href: p("/how-it-works"), label: dict.nav.howItWorks },
    { href: p("/contact"), label: dict.nav.contact },
  ];
  const isActive = (href: string) => pathname === href || (href !== p("/") && pathname.startsWith(href));

  return (
    <header className={cn("sticky top-0 z-40 border-b transition-colors", scrolled ? "border-line bg-paper/90 backdrop-blur" : "border-transparent bg-paper")}>
      <div className="container-x flex h-16 items-center justify-between gap-6">
        <Link href={p("/")} className="flex items-center gap-2" aria-label="ArchiTek Soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="ArchiTek Soft" className="h-7 w-auto" />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={cn("rounded-full px-3 py-1.5 text-sm font-medium transition-colors", isActive(n.href) ? "bg-ink-100 text-ink-950" : "text-ink-600 hover:text-ink-950")}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden items-center rounded-full border border-line bg-white p-0.5 text-xs font-semibold sm:flex">
            {LOCALES.map((l) => (
              <Link key={l} href={localePath(l, bare)} className={cn("rounded-full px-2.5 py-1 transition-colors", l === locale ? "bg-ink-950 text-white" : "text-ink-500 hover:text-ink-900")} aria-label={LOCALE_LABELS[l].name}>
                {LOCALE_LABELS[l].short}
              </Link>
            ))}
          </div>
          <Link href={p("/start")} className="btn-primary hidden md:inline-flex">
            {dict.nav.start}
          </Link>
          <button className="btn-ghost -mr-2 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-line bg-paper lg:hidden">
          <div className="container-x flex flex-col gap-1 py-4">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className={cn("rounded-xl px-3 py-2.5 text-base font-medium", isActive(n.href) ? "bg-ink-100 text-ink-950" : "text-ink-700")}>
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2 px-3">
              {LOCALES.map((l) => (
                <Link key={l} href={localePath(l, bare)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", l === locale ? "border-ink-950 bg-ink-950 text-white" : "border-line text-ink-600")}>
                  {LOCALE_LABELS[l].short}
                </Link>
              ))}
            </div>
            <Link href={p("/start")} className="btn-primary mt-3">
              {dict.nav.start}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
