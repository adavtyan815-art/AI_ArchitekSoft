"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  /** Accessible names (optional so the layout can adopt them later; the visible labels are the fallback). */
  language?: string;
  primaryNav?: string;
};

/** Accessible name of the language switcher when the layout does not pass one. */
const LANGUAGE_LABEL: Record<Locale, string> = { hy: "Լեզու", ru: "Язык", en: "Language" };

/**
 * Site header v3: wordmark · Platform · Solutions ▾ · How it works · Work · About · Contact · lang · theme · CTA.
 * Hairline bottom border, no pills; the Solutions panel is a two-column editorial menu.
 * Mobile: full-screen sheet with serif links and a mono index.
 *
 * Keyboard: the closed sheet and the closed Solutions panel are `inert`, so nothing invisible is in the
 * tab order. The open sheet takes focus, keeps Tab inside the sheet + its toggle, and Escape closes it
 * and returns focus to the toggle. The Solutions panel is a plain disclosure (button + list of links):
 * hover or click opens it; Escape, an outside click or leaving it with Tab closes it.
 *
 * Language links keep the query string (segment, filters, UTM). It is read from the address bar when
 * the link is used — not with useSearchParams, which would force every page under this layout-level
 * header out of static rendering.
 */
export function SiteHeader({ locale, nav }: { locale: Locale; nav: HeaderNav }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

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
  // Mobile sheet: focus moves in on open and back to the toggle on close; Escape closes; Tab stays
  // inside the sheet and its toggle button.
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) toggleRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    const sheet = sheetRef.current;
    const focusables = () => (sheet ? Array.from(sheet.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")) : []);
    const t = window.setTimeout(() => focusables()[0]?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      const toggle = toggleRef.current;
      if (!items.length || !toggle) return;
      const first = items[0];
      const last = items[items.length - 1];
      const at = document.activeElement;
      // order of the loop: toggle → first … last → toggle
      if (e.shiftKey && at === toggle) {
        e.preventDefault();
        last.focus();
      } else if (e.shiftKey && at === first) {
        e.preventDefault();
        toggle.focus();
      } else if (!e.shiftKey && at === last) {
        e.preventDefault();
        toggle.focus();
      } else if (!e.shiftKey && at === toggle) {
        e.preventDefault();
        first.focus();
      } else if (at !== toggle && !sheet?.contains(at)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  // The sheet only exists below xl: if the window grows past it while open, release the page.
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(min-width: 1280px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [open]);
  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // keep the keyboard user where they were: on the button that owns the panel
      if (menuRef.current?.contains(document.activeElement)) menuBtnRef.current?.focus();
      setMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const bare = pathname.replace(/^\/(ru|en)(?=\/|$)/, "") || "/";
  const p = (path: string) => localePath(locale, path);
  /** Language links carry the current query string, read at the moment the link is used. */
  const keepQuery = (e: React.SyntheticEvent<HTMLAnchorElement>, l: Locale) => {
    const base = localePath(l, bare);
    const next = base + window.location.search;
    if (e.currentTarget.getAttribute("href") !== next) e.currentTarget.setAttribute("href", next);
  };
  const langLinkProps = (l: Locale) => ({
    href: localePath(l, bare),
    hrefLang: l,
    lang: l,
    onPointerDown: (e: React.PointerEvent<HTMLAnchorElement>) => keepQuery(e, l),
    onFocus: (e: React.FocusEvent<HTMLAnchorElement>) => keepQuery(e, l),
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
      const search = window.location.search;
      if (!search || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      router.push(localePath(l, bare) + search);
    },
  });
  const isActive = (href: string) => pathname === href || (href !== p("/") && pathname.startsWith(href));
  const solutionsActive = nav.solutionsMenu.some((m) => isActive(p(m.href)));
  const langLabel = nav.language ?? LANGUAGE_LABEL[locale];
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
      <header className={cn("sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300", open ? "border-line bg-bg" : scrolled ? "border-line bg-bg shadow-[0_10px_24px_-20px_rgba(0,0,0,0.3)]" : "border-transparent bg-transparent")}>
        <div className="container-x flex h-16 items-center justify-between gap-6 xl:h-[76px]">
          <Link href={p("/")} className="flex shrink-0 items-center" aria-label="ArchiTek Soft">
            <BrandLogo className="h-[34px] xl:h-10" />
          </Link>

          <nav className="hidden h-full items-center xl:flex" aria-label={nav.primaryNav ?? nav.menu}>
            <Link href={p("/platform")} className={linkCls(isActive(p("/platform")))}>
              {nav.kitchenpro}
            </Link>
            <div
              ref={menuRef}
              className="relative flex h-full items-center"
              onMouseEnter={() => setMenu(true)}
              onMouseLeave={() => setMenu(false)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setMenu(false);
              }}
            >
              {/* A pointer click only opens (hover has usually opened it already, so a toggle would close it
                  under the cursor); the keyboard toggles. Escape, an outside click or tabbing away closes. */}
              <button
                ref={menuBtnRef}
                type="button"
                className={cn(linkCls(solutionsActive || menu), "inline-flex items-center gap-1")}
                aria-expanded={menu}
                aria-controls="solutions-panel"
                onClick={(e) => setMenu((m) => (e.detail === 0 ? !m : true))}
              >
                {nav.solutions}
                <ChevronDown size={13} aria-hidden className={cn("transition-transform", menu && "rotate-180")} />
              </button>
              <div id="solutions-panel" className={cn("absolute top-full left-0 pt-1 transition-[opacity,transform] duration-150", menu ? "opacity-100" : "pointer-events-none -translate-y-1 opacity-0")} inert={!menu ? true : undefined}>
                <div className="w-[560px] rounded-lg border border-line bg-surface p-2 shadow-lift">
                  <div className="grid grid-cols-2 gap-1">
                    {nav.solutionsMenu.map((m, i) => (
                      <Link key={m.href} href={p(m.href)} aria-current={isActive(p(m.href)) ? "page" : undefined} className={cn("group flex gap-3 rounded-md px-3 py-3 transition-colors hover:bg-surface-2", isActive(p(m.href)) && "bg-surface-2")}>
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
            <div className="hidden items-center font-mono text-[11px] font-medium tracking-[0.08em] md:flex" role="group" aria-label={langLabel}>
              {LOCALES.map((l, i) => (
                <span key={l} className="flex items-center">
                  {i > 0 ? (
                    <span className="mx-1.5 text-faint" aria-hidden>
                      /
                    </span>
                  ) : null}
                  <Link {...langLinkProps(l)} className={cn("transition-colors", l === locale ? "text-fg" : "text-faint hover:text-fg")} aria-label={LOCALE_LABELS[l].name} aria-current={l === locale ? "true" : undefined}>
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
            <button ref={toggleRef} type="button" className="btn-ghost btn-icon xl:hidden" onClick={() => setOpen((o) => !o)} aria-label={nav.menu} aria-expanded={open} aria-controls="mobile-menu">
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
      <div ref={sheetRef} id="mobile-menu" className={cn("mobile-sheet fixed inset-0 top-16 z-[35] flex flex-col transition-opacity duration-200 xl:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={!open} inert={!open ? true : undefined}>
        <nav className="container-x flex flex-1 flex-col overflow-y-auto pt-2 pb-6" aria-label={nav.menu}>
          <Link href={p("/platform")} className="flex items-center justify-between border-b border-line py-4 font-display text-[1.75rem] text-fg">
            {nav.kitchenpro}
            <ArrowUpRight size={20} className="text-faint" />
          </Link>
          <div className="mt-6 kicker">{nav.solutions}</div>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {nav.solutionsMenu.map((m) => (
              <li key={m.href}>
                <Link href={p(m.href)} className="flex min-h-14 items-center justify-between gap-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-medium text-fg">{m.title}</span>
                    <span className="block text-[12.5px] text-muted">{m.text}</span>
                  </span>
                  <ArrowUpRight size={16} className="flex-none text-faint" />
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {[...primary, [p("/faq"), nav.faq] as [string, string]].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="flex min-h-12 items-center justify-between py-2.5 text-[16px] font-medium text-fg">
                  {label}
                  <ArrowUpRight size={16} className="text-faint" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 inline-flex rounded-md border border-line p-0.5 font-mono text-[12px] tracking-[0.08em]" role="group" aria-label={langLabel}>
            {LOCALES.map((l) => (
              <Link key={l} {...langLinkProps(l)} className={cn("inline-flex h-10 items-center rounded-[4px] px-4 transition-colors", l === locale ? "bg-fg text-bg" : "text-muted hover:text-fg")} aria-label={LOCALE_LABELS[l].name} aria-current={l === locale ? "true" : undefined}>
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
