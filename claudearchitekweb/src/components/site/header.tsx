"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { LOCALES, LOCALE_LABELS, localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export type HeaderNav = {
  kitchenpro: string;
  howItWorks: string;
  portfolio: string;
  contact: string;
  start: string;
  menu: string;
  theme: { light: string; dark: string };
  solutions: string;
  about: string;
  faq: string;
  solutionsMenu: { href: string; title: string; text: string }[];
};

/**
 * Site header v3: wordmark · Platform · Solutions ▾ · How it works · Work · About · Contact · lang · theme · CTA.
 * Hairline bottom border, no pills; the Solutions panel is a two-column editorial menu.
 * Mobile: full-screen sheet with serif links and a mono index.
 */
export function SiteHeader({ locale, nav }: { locale: Locale; nav: HeaderNav }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);
  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const bare = pathname.replace(/^\/(ru|en)(?=\/|$)/, "") || "/";
  const p = (path: string) => localePath(locale, path);
  const isActive = (href: string) => pathname === href || (href !== p("/") && pathname.startsWith(href));
  const solutionsActive = nav.solutionsMenu.some((m) => isActive(p(m.href)));
  const linkCls = (active: boolean) =>
    cn(
      "relative px-3 py-2 text-[13.5px] font-medium whitespace-nowrap transition-colors after:absolute after:inset-x-3 after:-bottom-[1px] after:h-px after:origin-left after:scale-x-0 after:bg-fg after:transition-transform after:duration-200",
      active ? "text-fg after:scale-x-100" : "text-fg-2 hover:text-fg hover:after:scale-x-100",
    );

  const primary: [string, string][] = [
    [p("/how-it-works"), nav.howItWorks],
    [p("/portfolio"), nav.portfolio],
    [p("/about"), nav.about],
    [p("/contact"), nav.contact],
  ];

  return (
    <>
      <header className={cn("sticky top-0 z-40 border-b transition-[background-color,border-color] duration-200", scrolled ? "glass border-line" : "border-transparent bg-bg")}>
        <div className="container-x flex h-16 items-center justify-between gap-6 lg:h-[76px]">
          <Link href={p("/")} className="flex shrink-0 items-center" aria-label="ArchiTek Soft">
            <BrandLogo className="h-7" />
          </Link>

          <nav className="hidden h-full items-center lg:flex" aria-label="Primary">
            <Link href={p("/platform")} className={linkCls(isActive(p("/platform")))}>
              {nav.kitchenpro}
            </Link>
            <div ref={menuRef} className="relative flex h-full items-center" onMouseEnter={() => setMenu(true)} onMouseLeave={() => setMenu(false)}>
              <button type="button" className={cn(linkCls(solutionsActive || menu), "inline-flex items-center gap-1")} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
                {nav.solutions}
                <ChevronDown size={13} className={cn("transition-transform", menu && "rotate-180")} />
              </button>
              <div className={cn("absolute top-full left-0 pt-1 transition-[opacity,transform] duration-150", menu ? "opacity-100" : "pointer-events-none -translate-y-1 opacity-0")} role="menu">
                <div className="w-[560px] rounded-lg border border-line bg-surface p-2 shadow-lift">
                  <div className="grid grid-cols-2 gap-1">
                    {nav.solutionsMenu.map((m, i) => (
                      <Link key={m.href} href={p(m.href)} role="menuitem" className={cn("group flex gap-3 rounded-md px-3 py-3 transition-colors hover:bg-surface-2", isActive(p(m.href)) && "bg-surface-2")}>
                        <span className="index mt-1 w-6 flex-none">{String(i + 1).padStart(2, "0")}</span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-[14px] font-semibold text-fg">
                            {m.title}
                            <ArrowUpRight size={13} className="text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                          </span>
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{m.text}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {primary.map(([href, label]) => (
              <Link key={href} href={href} className={linkCls(isActive(href))}>
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center font-mono text-[11px] font-medium tracking-[0.08em] md:flex" aria-label="Language">
              {LOCALES.map((l, i) => (
                <span key={l} className="flex items-center">
                  {i > 0 ? <span className="mx-1.5 text-faint">/</span> : null}
                  <Link href={localePath(l, bare)} className={cn("transition-colors", l === locale ? "text-fg" : "text-faint hover:text-fg")} aria-label={LOCALE_LABELS[l].name} aria-current={l === locale ? "true" : undefined}>
                    {LOCALE_LABELS[l].short}
                  </Link>
                </span>
              ))}
            </div>
            <ThemeToggle labels={nav.theme} />
            <Link href={p("/start")} className="btn-primary btn-sm hidden md:inline-flex">
              {nav.start}
              <ArrowUpRight size={15} />
            </Link>
            <button className="btn-ghost btn-icon lg:hidden" onClick={() => setOpen((o) => !o)} aria-label={nav.menu} aria-expanded={open} aria-controls="mobile-menu">
              <span className="relative block h-3.5 w-5">
                <span className={cn("absolute inset-x-0 top-0 h-px bg-fg transition-transform duration-200", open && "top-1/2 rotate-45")} />
                <span className={cn("absolute inset-x-0 top-1/2 h-px bg-fg transition-opacity duration-200", open && "opacity-0")} />
                <span className={cn("absolute inset-x-0 bottom-0 h-px bg-fg transition-transform duration-200", open && "bottom-1/2 -rotate-45")} />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sheet */}
      <div id="mobile-menu" className={cn("fixed inset-0 top-16 z-[35] flex flex-col bg-bg transition-opacity duration-200 lg:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={!open}>
        <nav className="container-x flex flex-1 flex-col overflow-y-auto pt-2 pb-6" aria-label="Mobile">
          <Link href={p("/platform")} className="flex items-center justify-between border-b border-line py-4 font-display text-[1.75rem] text-fg">
            {nav.kitchenpro}
            <ArrowUpRight size={20} className="text-faint" />
          </Link>
          <div className="mt-5 kicker">{nav.solutions}</div>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {nav.solutionsMenu.map((m, i) => (
              <li key={m.href}>
                <Link href={p(m.href)} className="flex items-center gap-4 py-3">
                  <span className="index w-6 flex-none">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-medium text-fg">{m.title}</span>
                    <span className="block text-[12.5px] text-muted">{m.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {[...primary, [p("/faq"), nav.faq] as [string, string]].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="flex items-center justify-between py-3 text-[16px] font-medium text-fg">
                  {label}
                  <ArrowUpRight size={16} className="text-faint" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-4 font-mono text-[12px] tracking-[0.08em]">
            {LOCALES.map((l) => (
              <Link key={l} href={localePath(l, bare)} className={cn("border-b pb-0.5", l === locale ? "border-fg text-fg" : "border-transparent text-muted")}>
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
