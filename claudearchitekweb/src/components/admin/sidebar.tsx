"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, Building2, FolderKanban, Images, Inbox, LayoutDashboard, Link2, Megaphone, Menu, MonitorPlay, Settings, Sparkles, Users, X, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/leads", label: "Leads", icon: Inbox },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/companies", label: "Companies", icon: Building2 },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/admin/media", label: "Media", icon: Images },
  { href: "/admin/pages", label: "Client pages", icon: Link2 },
  { href: "/admin/live", label: "Live 3D", icon: MonitorPlay },
  { href: "/admin/smm", label: "SMM", icon: Megaphone },
  { href: "/admin/portfolio", label: "Portfolio", icon: Sparkles },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (item: (typeof ADMIN_NAV)[number]) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));
  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {ADMIN_NAV.map((item) => (
        <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors", isActive(item) ? "bg-ink-950 text-white" : "text-ink-600 hover:bg-ink-100 hover:text-ink-950")}>
          <item.icon size={17} className={cn(isActive(item) ? "text-white" : "text-ink-400")} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-white lg:flex">
        <div className="flex h-16 items-center px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="ArchiTek Soft" className="h-6 w-auto" />
          <span className="ml-2 rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">Admin</span>
        </div>
        {nav}
        <div className="border-t border-line p-4 text-xs text-ink-500">
          <div className="truncate font-medium text-ink-800">{user.name}</div>
          <div className="truncate">{user.email}</div>
        </div>
      </aside>
      <button className="fixed top-3 left-3 z-40 rounded-xl border border-line bg-white p-2 shadow-soft lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu size={18} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="relative flex w-64 flex-col bg-white py-4 shadow-card">
            <div className="flex items-center justify-between px-5 pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo.png" alt="ArchiTek Soft" className="h-6 w-auto" />
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1 hover:bg-ink-100">
                <X size={18} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}
    </>
  );
}
