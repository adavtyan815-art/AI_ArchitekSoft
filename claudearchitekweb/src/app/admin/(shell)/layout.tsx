import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAdminDict } from "@/lib/i18n/admin";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";

export const dynamic = "force-dynamic";

/** Every page under /admin/(shell) requires a signed-in user. /admin/login lives outside this group. */
export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  const { t, locale } = await getAdminDict();
  return (
    <div className="min-h-screen bg-bg text-fg">
      <AdminSidebar user={user} labels={{ ...t.nav }} />
      <div className="lg:pl-60">
        <AdminTopbar user={user} locale={locale} labels={{ website: t.nav.website, logout: t.nav.logout, search: t.nav.search, theme: t.theme, lang: t.langSwitch }} />
        <main className="mx-auto w-full max-w-7xl px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-7 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}
