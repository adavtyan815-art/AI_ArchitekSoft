import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { logoutAction } from "@/app/admin/actions/auth-actions";
import { GlobalSearch } from "./global-search";

export function AdminTopbar({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-white/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center gap-3 pl-10 lg:pl-0">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-2">
        <Link href="/" target="_blank" className="btn-ghost btn-sm hidden sm:inline-flex">
          Website
          <ExternalLink size={14} />
        </Link>
        <span className="hidden text-sm text-ink-500 md:inline">{user.name}</span>
        <form action={logoutAction}>
          <button className="btn-secondary btn-sm" type="submit">
            <LogOut size={14} />
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
