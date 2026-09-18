import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { logoutAction, setAdminLangAction } from "@/app/admin/actions/auth-actions";
import { GlobalSearch, MobileSearch, type SearchLabels } from "./global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { type AdminLocale } from "@/lib/i18n/admin";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

export type AdminTopbarLabels = {
  website: string;
  logout: string;
  search: string;
  theme: { light: string; dark: string };
  lang: { hy: string; en: string };
  /** The search strings: passed down rather than re-read, see the note on the component. */
  searchStrings: { loading: string; noResults: string; results: string; open: string; close: string };
};

/**
 * Every label arrives as a prop and nothing is awaited here.
 *
 * This used to call `getAdminDict()` itself, which made the topbar an async component inside the
 * shell: SSR then had a suspend point between the sidebar and the page, and the shell HTML could be
 * flushed around it. The layout has already awaited the dictionary, so reading it a second time
 * bought nothing and only gave the render one more place to split.
 */
export function AdminTopbar({ user, locale, labels }: { user: SessionUser; locale: AdminLocale; labels: AdminTopbarLabels }) {
  const searchLabels: SearchLabels = {
    placeholder: labels.search,
    loading: labels.searchStrings.loading,
    noResults: labels.searchStrings.noResults,
    results: labels.searchStrings.results,
    open: labels.searchStrings.open,
    close: labels.searchStrings.close,
  };
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line glass px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <BrandLogo className="h-6 lg:hidden" />
        <div className="hidden min-w-0 flex-1 sm:block">
          <GlobalSearch labels={searchLabels} />
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-3">
        <MobileSearch labels={searchLabels} />
        <form action={setAdminLangAction} className="flex items-center font-mono text-[11px] tracking-[0.1em] uppercase sm:gap-1">
          {(["hy", "en"] as const).map((l, i) => (
            <span key={l} className="flex items-center">
              {i ? <span aria-hidden className="text-faint">/</span> : null}
              <button
                name="lang"
                value={l}
                type="submit"
                aria-current={l === locale ? "true" : undefined}
                // A 40px tap target: the plain text buttons measured 34x18 and 23x18 on a phone.
                className={cn("inline-flex min-h-10 items-center px-2 uppercase underline-offset-[5px] transition-colors", l === locale ? "text-fg underline decoration-accent decoration-2" : "text-muted hover:text-fg")}
              >
                {labels.lang[l]}
              </button>
            </span>
          ))}
        </form>
        <span aria-hidden className="hidden h-5 w-px bg-line sm:block" />
        <ThemeToggle labels={labels.theme} />
        <Link href="/" target="_blank" className="btn-ghost btn-sm hidden font-mono text-[11px] tracking-[0.08em] uppercase md:inline-flex">
          {labels.website}
          <ExternalLink size={13} />
        </Link>
        <span className="hidden font-mono text-[11px] text-muted xl:inline">{user.name}</span>
        <form action={logoutAction}>
          <button className="btn-ghost btn-sm" type="submit" title={labels.logout}>
            <LogOut size={14} />
            <span className="hidden sm:inline">{labels.logout}</span>
          </button>
        </form>
      </div>
    </header>
  );
}
