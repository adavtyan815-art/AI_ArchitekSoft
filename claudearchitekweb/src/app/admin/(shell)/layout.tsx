import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";

export const dynamic = "force-dynamic";

/** Every page under /admin/(shell) requires a signed-in user. /admin/login lives outside this group. */
export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  return (
    <div className="min-h-screen bg-ink-50 text-ink-900">
      <AdminSidebar user={user} />
      <div className="lg:pl-60">
        <AdminTopbar user={user} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
