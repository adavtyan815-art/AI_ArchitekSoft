"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Send } from "lucide-react";
import { trackEvent } from "@/components/site/track";

/**
 * Sticky bottom action bar on phones: start a project + Telegram.
 * It appears only once the first screen (which carries its own call to action) has been scrolled past,
 * and retires while the footer — which lists every contact channel — is in view.
 * Hidden on /start and /contact, where the page itself is the action.
 */
export function MobileCta({ startHref, startLabel, telegramUrl, telegramLabel }: { startHref: string; startLabel: string; telegramUrl: string; telegramLabel: string }) {
  const pathname = usePathname();
  const off = /\/(start|contact)(\/|$)/.test(pathname);
  // The bar lives in the layout, which passes no locale; the URL already carries it (hy has no prefix).
  const locale = /^\/(ru|en)(\/|$)/.exec(pathname)?.[1] ?? "hy";
  const [past, setPast] = useState(false);
  const [footer, setFooter] = useState(false);

  useEffect(() => {
    if (off) return;
    const onScroll = () => setPast(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const f = document.querySelector("footer");
    const io = f && "IntersectionObserver" in window ? new IntersectionObserver((e) => setFooter(e.some((x) => x.isIntersecting)), { rootMargin: "0px 0px -40px 0px" }) : null;
    if (f && io) io.observe(f);
    return () => {
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, [off, pathname]);

  if (off) return null;
  const hidden = !past || footer;
  return (
    <div className="mobile-bar fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg pb-safe md:hidden" data-hidden={hidden} aria-hidden={hidden}>
      <div className="flex items-center gap-2 px-4 py-2">
        <Link
          href={startHref}
          className="btn-primary h-10 flex-1 max-sm:min-h-10 max-sm:py-2"
          tabIndex={hidden ? -1 : 0}
          onClick={() => trackEvent("cta_click", { locale, meta: { label: "mobile-bar", href: startHref } })}
        >
          {startLabel}
          <ArrowUpRight size={16} />
        </Link>
        <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-icon h-10 w-10" aria-label={telegramLabel} title={telegramLabel} tabIndex={hidden ? -1 : 0}>
          <Send size={16} />
        </a>
      </div>
    </div>
  );
}
