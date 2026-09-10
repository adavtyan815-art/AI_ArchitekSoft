"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { LOCALES, LOCALE_LABELS, localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
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
 * Corporate site header: KitchenPro · Solutions (dropdown) · How it works · Work · About · Contact · CTA.
 * Desktop: hover/click dropdown. Mobile: full-screen sheet with grouped links.
 * Receives only the strings it needs (small client payload).
 */
export function SiteHeader({ locale, nav }: { locale: Locale; nav: HeaderNav }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
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
  const linkCls = (active: boolean) => cn("rounded-full px-3 py-1.5 text-[13.5px] font-medium whitespace-nowrap transition-colors", active ? "bg-surface-2 text-fg" : "text-fg-2 hover:bg-surface-2 hover:text-fg");

  return (
    <>
      <header className={cn("sticky top-0 z-40 transition-[background-color,border-color] duration-200", scrolled ? "glass border-b border-line" : "border-b border-transparent bg-bg")}>
        <div className="container-x flex h-16 items-center justify-between gap-4 lg:h-[72px]">
          <Link href={p("/")} className="flex shrink-0 items-center" aria-label="ArchiTek Soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="ArchiTek Soft" width={125} height={40} className="h-7 w-auto dark:brightness-[1.35]" />
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            <Link href={p("/kitchenpro")} className={linkCls(isActive(p("/kitchenpro")))}>{nav.kitchenpro}</Link>
            <div ref={menuRef} className="relative" onMouseEnter={() => setMenu(true)} onMouseLeave={() => setMenu(false)}>
              <button type="button" className={cn(linkCls(solutionsActive || menu), "inline-flex items-center gap-1")} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
                {nav.solutions}
                <ChevronDown size={14} className={cn("transition-transform", menu && "rotate-180")} />
              </button>
              <div className={cn("absolute top-full left-0 pt-2 transition-[opacity,transform] duration-150", menu ? "opacity-100" : "pointer-events-none -translate-y-1 opacity-0")} role="menu">
                <div className="w-[340px] rounded-2xl border border-line bg-surface p-2 shadow-lift">
                  {nav.solutionsMenu.map((m) => (
                    <Link key={m.href} href={p(m.href)} role="menuitem" className={cn("flex flex-col rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2", isActive(p(m.href)) && "bg-surface-2")}>
                      <span className="text-sm font-semibold text-fg">{m.title}</span>
                      <span className="text-xs text-muted">{m.text}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <Link href={p("/how-it-works")} className={linkCls(isActive(p("/how-it-works")))}>{nav.howItWorks}</Link>
            <Link href={p("/portfolio")} className={linkCls(isActive(p("/portfolio")))}>{nav.portfolio}</Link>
            <Link href={p("/about")} className={linkCls(isActive(p("/about")))}>{nav.about}</Link>
            <Link href={p("/contact")} className={linkCls(isActive(p("/contact")))}>{nav.contact}</Link>
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

      {/* Mobile sheet */}
      <div id="mobile-menu" className={cn("fixed inset-0 z-50 flex flex-col bg-bg transition-opacity duration-200 lg:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={!open}>
        <div className="container-x flex h-16 items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="ArchiTek Soft" width={125} height={40} className="h-7 w-auto dark:brightness-[1.35]" />
          <button className="btn-ghost btn-icon" onClick={() => setOpen(false)} aria-label={nav.menu}>
            <X size={22} />
          </button>
        </div>
        <nav className="container-x flex flex-1 flex-col gap-1 overflow-y-auto py-2" aria-label="Mobile">
          <Link href={p("/kitchenpro")} className="flex items-center justify-between rounded-2xl px-4 py-3.5 font-display text-xl font-semibold text-fg">
            {nav.kitchenpro}
            <ArrowUpRight size={18} className="text-faint" />
          </Link>
          <div className="mt-2 px-4 text-[11px] font-semibold tracking-[0.12em] text-faint uppercase">{nav.solutions}</div>
          {nav.solutionsMenu.map((m) => (
            <Link key={m.href} href={p(m.href)} className={cn("rounded-2xl px-4 py-2.5", isActive(p(m.href)) ? "bg-surface-2" : "")}>
              <span className="block text-base font-medium text-fg">{m.title}</span>
              <span className="block text-xs text-muted">{m.text}</span>
            </Link>
          ))}
          <div className="my-2 hairline" />
          {[
            [p("/how-it-works"), nav.howItWorks],
            [p("/portfolio"), nav.portfolio],
            [p("/about"), nav.about],
            [p("/faq"), nav.faq],
            [p("/contact"), nav.contact],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-2xl px-4 py-2.5 text-base font-medium text-fg-2">
              {label}
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
