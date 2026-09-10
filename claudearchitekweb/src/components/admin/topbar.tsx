import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { logoutAction, setAdminLangAction } from "@/app/admin/actions/auth-actions";
import { GlobalSearch } from "./global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AdminLocale } from "@/lib/i18n/admin";
import { cn } from "@/lib/utils";

export function AdminTopbar({ user, locale, labels }: { user: SessionUser; locale: AdminLocale; labels: { website: string; logout: string; search: string; theme: { light: string; dark: string }; lang: { hy: string; en: string } } }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line glass px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="ArchiTek Soft" width={125} height={40} className="h-6 w-auto lg:hidden dark:brightness-[1.35]" />
        <div className="hidden min-w-0 flex-1 sm:block">
          <GlobalSearch placeholder={labels.search} />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <form action={setAdminLangAction} className="flex items-center rounded-full border border-line bg-surface p-0.5 text-[11px] font-semibold">
          {(["hy", "en"] as const).map((l) => (
            <button key={l} name="lang" value={l} type="submit" className={cn("rounded-full px-2.5 py-1 transition-colors", l === locale ? "bg-fg text-bg" : "text-muted hover:text-fg")}>
              {labels.lang[l]}
            </button>
          ))}
        </form>
        <ThemeToggle labels={labels.theme} />
        <Link href="/" target="_blank" className="btn-ghost btn-sm hidden md:inline-flex">
          {labels.website}
          <ExternalLink size={14} />
        </Link>
        <span className="hidden text-sm text-muted xl:inline">{user.name}</span>
        <form action={logoutAction}>
          <button className="btn-secondary btn-sm" type="submit" title={labels.logout}>
            <LogOut size={14} />
            <span className="hidden sm:inline">{labels.logout}</span>
          </button>
        </form>
      </div>
    </header>
  );
}
