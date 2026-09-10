"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Send } from "lucide-react";

/** Sticky bottom action bar on phones: start a project + Telegram. Hidden on /start and /contact. */
export function MobileCta({ startHref, startLabel, telegramUrl, telegramLabel }: { startHref: string; startLabel: string; telegramUrl: string; telegramLabel: string }) {
  const pathname = usePathname();
  if (/\/(start|contact)(\/|$)/.test(pathname)) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line glass pb-safe md:hidden">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Link href={startHref} className="btn-primary flex-1">
          {startLabel}
          <ArrowUpRight size={16} />
        </Link>
        <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-icon h-11 w-11" aria-label={telegramLabel}>
          <Send size={17} />
        </a>
      </div>
    </div>
  );
}
