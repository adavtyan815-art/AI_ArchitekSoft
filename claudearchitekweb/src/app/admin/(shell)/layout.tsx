import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAdminDict } from "@/lib/i18n/admin";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";
import { HtmlLang } from "@/components/site/html-lang";

export const dynamic = "force-dynamic";

/**
 * Where to come back to after signing in again. The middleware lets a request through when a session cookie is
 * present, so an expired or invalid session is first noticed here. A layout cannot see the URL, so the path comes
 * from the `x-pathname` request header (path + query) that the middleware sets. Only same-site admin paths are accepted.
 */
async function loginUrl(): Promise<string> {
  const path = (await headers()).get("x-pathname") ?? "";
  const safe = /^\/admin(\/|\?|$)/.test(path) && !path.startsWith("/admin/login") && !path.includes("//") && !path.includes("\\") && !path.includes("..") && path.length <= 512;
  return safe && path !== "/admin" ? `/admin/login?next=${encodeURIComponent(path)}` : "/admin/login";
}

/** Every page under /admin/(shell) requires a signed-in user. /admin/login lives outside this group. */
export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect(await loginUrl());
  const { t, locale } = await getAdminDict();
  return (
    // `lang` follows the admin language (the root <html lang> describes the public site), so screen readers,
    // hyphenation and spellcheck use the right language inside the admin.
    <div lang={locale} className="min-h-screen bg-bg text-fg">
      {/* The root layout only sets <html lang> on a full document load. After the language switch and
          after a soft navigation in from the public site the attribute has to be corrected client-side. */}
      <HtmlLang lang={locale} />
      <AdminSidebar user={user} labels={{ ...t.nav }} />
      {/* Below lg nothing may widen the page: a wider layout viewport pushes the fixed bottom tab bar out of reach. */}
      <div className="max-lg:overflow-x-clip lg:pl-58">
        <AdminTopbar
          user={user}
          locale={locale}
          labels={{
            website: t.nav.website,
            logout: t.nav.logout,
            search: t.nav.search,
            theme: t.theme,
            lang: t.langSwitch,
            searchStrings: { loading: t.common.loading, noResults: t.common.noResults, results: t.nav.searchResults, open: t.nav.openSearch, close: t.nav.close },
          }}
        />
        <main className="mx-auto w-full max-w-7xl min-w-0 px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-7 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}
