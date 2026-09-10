"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, Building2, CheckSquare, FolderKanban, Images, Inbox, LayoutDashboard, Link2, Megaphone, MonitorPlay, MoreHorizontal, Settings, Sparkles, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";

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
      {/* Desktop sidebar — 232px, paper surface, hairline on the right */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-58 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 flex-none items-center border-b border-line px-5">
          <BrandLogo className="h-6" />
        </div>
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto py-5" aria-label="Admin">
          {GROUPS.map((g, gi) => (
            <div key={gi}>
              {g.group ? <div className="mb-2 px-5 font-mono text-[10px] font-medium tracking-[0.16em] text-faint uppercase">{labels.groups[g.group]}</div> : null}
              <div className="flex flex-col">
                {g.items.map((item) => {
                  const Icon = ICONS[item.key];
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 py-[7px] pr-4 pl-5 text-[13.5px] transition-colors",
                        active ? "bg-surface-2 font-semibold text-fg" : "font-medium text-fg-2 hover:bg-surface-2/60 hover:text-fg"
                      )}
                    >
                      {active ? <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-fg" /> : null}
                      <Icon size={15} className={active ? "text-fg" : "text-faint"} />
                      <span className="truncate">{labels[item.key]}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="flex-none border-t border-line px-5 py-4">
          <div className="truncate text-[13px] font-semibold text-fg">{user.name}</div>
          <div className="truncate font-mono text-[10.5px] tracking-[0.02em] text-muted">{user.email}</div>
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
              <Link key={key} href={item.href} className={cn("flex min-w-0 flex-col items-center gap-1 py-2.5 font-mono text-[9.5px] tracking-[-0.01em]", active ? "text-accent" : "text-muted")}>
                <Icon size={18} />
                <span className="w-full truncate px-0.5 text-center">{labels[key]}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setMore(true)} className="flex min-w-0 flex-col items-center gap-1 py-2.5 font-mono text-[9.5px] tracking-[-0.01em] text-muted">
            <MoreHorizontal size={18} />
            <span className="w-full truncate px-0.5 text-center">{labels.more}</span>
          </button>
        </div>
      </nav>
      {more ? (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#17150f]/50" onClick={() => setMore(false)} />
          <div className="relative w-full rounded-t-xl border-t border-line bg-surface pb-safe">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">{labels.more}</span>
              <button className="btn-ghost btn-sm -mr-2" onClick={() => setMore(false)} aria-label="close">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-px bg-line">
              {all
                .filter((i) => !MOBILE_PRIMARY.includes(i.key))
                .map((item) => {
                  const Icon = ICONS[item.key];
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setMore(false)} className={cn("flex min-h-11 items-center gap-2.5 bg-surface px-4 py-3 text-[13px]", active ? "font-semibold text-accent" : "font-medium text-fg-2")}>
                      <Icon size={15} className={active ? "text-accent" : "text-faint"} />
                      <span className="truncate">{labels[item.key]}</span>
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
