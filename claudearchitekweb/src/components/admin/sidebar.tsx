"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, Building2, CheckSquare, FolderKanban, Images, Inbox, LayoutDashboard, Link2, Megaphone, MonitorPlay, MoreHorizontal, Settings, Sparkles, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

export type AdminNavLabels = {
  overview: string; leads: string; clients: string; companies: string; projects: string; tasks: string; media: string; pages: string; live: string; smm: string; portfolio: string; analytics: string; settings: string; more: string;
  groups: { work: string; clients: string; content: string; system: string };
};

const ICONS = { overview: LayoutDashboard, leads: Inbox, clients: Users, companies: Building2, projects: FolderKanban, tasks: CheckSquare, media: Images, pages: Link2, live: MonitorPlay, smm: Megaphone, portfolio: Sparkles, analytics: BarChart3, settings: Settings } as const;
type Key = keyof typeof ICONS;

const GROUPS: { group: keyof AdminNavLabels["groups"] | null; items: { key: Key; href: string; exact?: boolean }[] }[] = [
  { group: null, items: [{ key: "overview", href: "/admin", exact: true }] },
  { group: "work", items: [{ key: "leads", href: "/admin/leads" }, { key: "projects", href: "/admin/projects" }, { key: "tasks", href: "/admin/tasks" }] },
  { group: "clients", items: [{ key: "clients", href: "/admin/clients" }, { key: "companies", href: "/admin/companies" }, { key: "pages", href: "/admin/pages" }, { key: "live", href: "/admin/live" }] },
  { group: "content", items: [{ key: "media", href: "/admin/media" }, { key: "smm", href: "/admin/smm" }, { key: "portfolio", href: "/admin/portfolio" }] },
  { group: "system", items: [{ key: "analytics", href: "/admin/analytics" }, { key: "settings", href: "/admin/settings" }] },
];

/** Mobile bottom tab bar shows these five; everything else lives under "more". */
const MOBILE_PRIMARY: Key[] = ["overview", "leads", "projects", "smm", "media"];

export function AdminSidebar({ user, labels }: { user: SessionUser; labels: AdminNavLabels }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));
  const all = GROUPS.flatMap((g) => g.items);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="ArchiTek Soft" width={125} height={40} className="h-6 w-auto dark:brightness-[1.35]" />
        </div>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4" aria-label="Admin">
          {GROUPS.map((g, gi) => (
            <div key={gi}>
              {g.group ? <div className="mb-1 px-3 text-[10.5px] font-semibold tracking-[0.12em] text-faint uppercase">{labels.groups[g.group]}</div> : null}
              <div className="flex flex-col gap-0.5">
                {g.items.map((item) => {
                  const Icon = ICONS[item.key];
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors", active ? "bg-fg text-bg" : "text-fg-2 hover:bg-surface-2 hover:text-fg")}>
                      <Icon size={16} className={cn(active ? "text-bg" : "text-faint")} />
                      {labels[item.key]}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-line p-4 text-xs text-muted">
          <div className="truncate font-medium text-fg">{user.name}</div>
          <div className="truncate">{user.email}</div>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line glass pb-safe lg:hidden" aria-label="Admin mobile">
        <div className="grid grid-cols-6">
          {MOBILE_PRIMARY.map((key) => {
            const item = all.find((i) => i.key === key)!;
            const Icon = ICONS[key];
            const active = isActive(item.href, item.exact);
            return (
              <Link key={key} href={item.href} className={cn("flex min-w-0 flex-col items-center gap-1 py-2 text-[10px] font-medium", active ? "text-fg" : "text-muted")}>
                <Icon size={19} className={active ? "text-accent" : undefined} />
                <span className="w-full truncate px-1 text-center">{labels[key]}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setMore(true)} className="flex min-w-0 flex-col items-center gap-1 py-2 text-[10px] font-medium text-muted">
            <MoreHorizontal size={19} />
            <span className="w-full truncate px-1 text-center">{labels.more}</span>
          </button>
        </div>
      </nav>
      {more ? (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMore(false)} />
          <div className="relative w-full rounded-t-3xl bg-surface p-4 pb-safe shadow-lift">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="font-display text-base font-semibold text-fg">{labels.more}</span>
              <button className="btn-ghost btn-icon" onClick={() => setMore(false)} aria-label="close">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {all
                .filter((i) => !MOBILE_PRIMARY.includes(i.key))
                .map((item) => {
                  const Icon = ICONS[item.key];
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setMore(false)} className={cn("flex flex-col items-center gap-1.5 rounded-2xl border border-line p-3 text-center text-xs font-medium", isActive(item.href, item.exact) ? "bg-fg text-bg" : "text-fg-2")}>
                      <Icon size={18} />
                      {labels[item.key]}
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
