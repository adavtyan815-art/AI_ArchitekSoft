import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { aiStatus } from "@/lib/ai";
import { PLATFORM_META, platformStatus } from "@/lib/social";
import { listPosts, smmStats, type PostRow } from "@/lib/smm-admin";
import { fmtYerevan, yerevanDay } from "@/lib/tz";
import { cn } from "@/lib/utils";
import { getAdminDict, labelFor, type AdminDict } from "@/lib/i18n/admin";
import { PageHeader, Panel, SpecStrip, StatCard, StatusBadge } from "@/components/admin/shell";
import { Notice } from "@/components/admin/notice";
import { Empty } from "@/components/ui";
import { PlatformChip, PlatformDots } from "@/components/admin/smm/platform-chip";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/form-buttons";
import { quickActionForm } from "@/app/admin/actions/smm-actions";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function filterPosts(posts: PostRow[], tab: string) {
  if (tab === "drafts") return posts.filter((p) => p.status === "draft");
  if (tab === "published") return posts.filter((p) => ["published", "partially_published"].includes(p.status)).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  if (tab === "all") return posts;
  return posts.filter((p) => ["awaiting_approval", "approved", "scheduled"].includes(p.status)).sort((a, b) => (a.scheduledAt ?? "9").localeCompare(b.scheduledAt ?? "9"));
}

export default async function SmmHubPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const { t } = await getAdminDict();
  const L = t.smm;
  const sp = await searchParams;
  const view = first(sp.view) === "calendar" ? "calendar" : "";
  const tab = view || first(sp.tab);
  const posts = listPosts();
  const stats = smmStats();
  const statuses = platformStatus();
  const aiRaw = aiStatus();
  const ai = { provider: aiRaw.provider, model: aiRaw.provider === "template" ? t.smm.templatesModel : aiRaw.model };
  const rows = filterPosts(posts, tab);
  const counts = { "": filterPosts(posts, "").length, drafts: filterPosts(posts, "drafts").length, published: filterPosts(posts, "published").length, all: posts.length };

  const tabs = [
    { key: "", label: L.tabs.queue, count: counts[""] },
    { key: "calendar", label: L.tabs.calendar, count: undefined as number | undefined },
    { key: "drafts", label: L.tabs.drafts, count: counts.drafts },
    { key: "published", label: L.tabs.published, count: counts.published },
    { key: "all", label: L.tabs.all, count: counts.all },
  ];

  return (
    <>
      <PageHeader
        title={L.title}
        subtitle={L.subtitle}
        actions={
          <Link href="/admin/smm/new" className="btn-brand btn-sm">
            <Plus size={14} /> {L.newPost}
          </Link>
        }
      />
      <Notice text={sp.notice} tone={sp.tone} />

      <SpecStrip>
        <StatCard label={L.stats.awaiting} value={stats.awaiting} tone={stats.awaiting ? "warning" : undefined} hint={L.statHints.awaiting} />
        <StatCard label={L.stats.scheduled} value={stats.scheduled} hint={L.statHints.scheduled} tone={stats.scheduled ? "brand" : undefined} />
        <StatCard label={L.stats.published30} value={stats.published30} hint={L.statHints.published30} tone={stats.published30 ? "success" : undefined} />
        <StatCard label={L.stats.failed} value={stats.failed} hint={L.statHints.failed} tone={stats.failed ? "danger" : undefined} />
      </SpecStrip>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-y border-line py-2.5">
        <span className="mr-1 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{L.connections}</span>
        {Object.entries(statuses).map(([p, st]) => (
          <PlatformChip key={p} platform={p} meta={PLATFORM_META[p]} status={st} statusLabel={labelFor(t, "connection", st)} title={L.statusExplain[st as keyof typeof L.statusExplain] ?? st} />
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] text-fg-2" title={ai.provider === "template" ? L.aiTemplateTitle : `${ai.provider} · ${ai.model}`}>
          <span className={cn("h-1.5 w-1.5", ai.provider === "template" ? "bg-warning" : "bg-success")} />
          {L.aiWriter}: <b className="font-semibold text-fg">{ai.provider}</b> <span className="text-muted">· {ai.model}</span>
        </span>
        <p className="caption w-full">
          {L.dryRunNote} <Link href="/admin/settings?tab=integrations" className="text-accent u-link">{L.settingsLink}</Link>
        </p>
      </div>

      <div className="mt-4 mb-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-5 border-b border-line">
          {tabs.map((tb) => {
            const href = tb.key === "calendar" ? "/admin/smm?view=calendar" : tb.key ? `/admin/smm?tab=${tb.key}` : "/admin/smm";
            const active = tab === tb.key;
            return (
              <Link key={tb.key} href={href} className={cn("-mb-px inline-flex items-center gap-1.5 border-b-2 py-2.5 font-mono text-[12px] tracking-[0.02em] whitespace-nowrap transition-colors", active ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg")}>
                {tb.label}
                {typeof tb.count === "number" ? <span className={cn("num text-[10.5px]", active ? "text-accent" : "text-faint")}>{tb.count}</span> : null}
              </Link>
            );
          })}
        </div>
      </div>

      {view === "calendar" ? <Calendar posts={posts} month={first(sp.month)} L={L} /> : <PostTable rows={rows} tab={tab} t={t} L={L} />}
    </>
  );
}

function PostTable({ rows, tab, t, L }: { rows: PostRow[]; tab: string; t: AdminDict; L: AdminDict["smm"] }) {
  if (rows.length === 0) {
    return (
      <Empty
        title={tab === "" ? L.emptyQueue : L.emptyOther}
        text={L.emptyText}
        action={
          <Link href="/admin/smm/new" className="btn-brand btn-sm">
            <Plus size={14} /> {L.newPost}
          </Link>
        }
      />
    );
  }
  const whenLabel = tab === "published" ? L.table.published : L.table.scheduled;
  return (
    <div className="card overflow-x-auto max-md:overflow-visible max-md:border-none max-md:bg-transparent">
      <table className="table-admin table-responsive">
        <thead>
          <tr>
            <th>{L.table.post}</th>
            <th>{L.table.project}</th>
            <th>{L.table.language}</th>
            <th>{L.table.platforms}</th>
            <th>{whenLabel}</th>
            <th>{L.table.status}</th>
            <th className="num">{L.table.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td data-label={L.table.post}>
                <Link href={`/admin/smm/${p.id}`} className="font-semibold text-fg hover:text-accent">{p.title}</Link>
                <div className="text-xs text-muted">{labelFor(t, "goals", p.goal)}</div>
              </td>
              <td data-label={L.table.project} className="text-xs">
                {p.projectId ? (
                  <Link href={`/admin/projects/${p.projectId}`} className="text-fg-2 hover:text-accent">{p.projectCode} · {p.projectTitle}</Link>
                ) : (
                  <span className="text-faint">—</span>
                )}
              </td>
              <td data-label={L.table.language} className="font-mono text-[11px] tracking-[0.08em] text-fg-2 uppercase">{p.language}</td>
              <td data-label={L.table.platforms}>
                <PlatformDots variants={p.variants} metaMap={PLATFORM_META} offLabel={L.editor.off} />
              </td>
              <td data-label={whenLabel} className="font-mono text-[12px] whitespace-nowrap text-muted">{tab === "published" ? fmtYerevan(p.publishedAt) : fmtYerevan(p.scheduledAt)}</td>
              <td data-label={L.table.status}>
                <StatusBadge value={p.status} label={labelFor(t, "postStatus", p.status)} />
              </td>
              <td data-label="">
                <div className="flex flex-wrap justify-end gap-1">
                  {["draft", "scheduled"].includes(p.status) ? (
                    <form action={quickActionForm}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="op" value="approval" />
                      <SubmitButton variant="secondary" className="btn-sm" pendingText={L.act.sending}>{L.act.sendApproval}</SubmitButton>
                    </form>
                  ) : null}
                  {p.status === "awaiting_approval" ? (
                    <form action={quickActionForm}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="op" value="approve" />
                      <SubmitButton variant="secondary" className="btn-sm" pendingText="…">{L.act.approve}</SubmitButton>
                    </form>
                  ) : null}
                  {!["published", "publishing", "cancelled"].includes(p.status) ? (
                    <form action={quickActionForm}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="op" value="publish" />
                      <SubmitButton variant="brand" className="btn-sm" pendingText={L.act.publishing}>{L.act.publishNow}</SubmitButton>
                    </form>
                  ) : null}
                  {!["published", "cancelled"].includes(p.status) ? (
                    <form action={quickActionForm}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="op" value="cancel" />
                      <ConfirmSubmit message={L.cancelConfirm}>{L.act.cancel}</ConfirmSubmit>
                    </form>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DAY_TONE: Record<string, string> = {
  published: "border-transparent bg-success-soft text-success",
  partially_published: "border-transparent bg-success-soft text-success",
  awaiting_approval: "border-transparent bg-warning-soft text-warning",
  failed: "border-transparent bg-danger-soft text-danger",
  cancelled: "border-transparent bg-danger-soft text-danger",
};

function Calendar({ posts, month, L }: { posts: PostRow[]; month: string; L: AdminDict["smm"] }) {
  const now = new Date();
  const m = /^\d{4}-\d{2}$/.test(month) ? month : yerevanDay(now.toISOString()).slice(0, 7);
  const [y, mo] = m.split("-").map(Number);
  const firstDay = new Date(Date.UTC(y, mo - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const startOffset = (firstDay.getUTCDay() + 6) % 7; // Monday-first
  const prev = new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
  const today = yerevanDay(now.toISOString());
  const byDay = new Map<string, PostRow[]>();
  for (const p of posts) {
    const when = p.scheduledAt ?? p.publishedAt;
    if (!when) continue;
    const key = yerevanDay(when);
    if (!key.startsWith(m)) continue;
    byDay.set(key, [...(byDay.get(key) ?? []), p]);
  }
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const label = `${L.calendar.months[mo - 1]} ${y}`;
  const dayKeys = [...byDay.keys()].sort();

  return (
    <Panel
      title={label}
      actions={
        <div className="flex items-center gap-1">
          <Link href={`/admin/smm?view=calendar&month=${prev}`} className="btn-ghost btn-sm">← {L.calendar.prev}</Link>
          <Link href="/admin/smm?view=calendar" className="btn-ghost btn-sm">{L.calendar.today}</Link>
          <Link href={`/admin/smm?view=calendar&month=${next}`} className="btn-ghost btn-sm">{L.calendar.next} →</Link>
        </div>
      }
    >
      {/* Month grid — from md up */}
      <div className="hidden grid-cols-7 gap-px overflow-hidden rounded-md border border-line bg-line text-xs md:grid">
        {L.calendar.weekdays.map((d) => (
          <div key={d} className="bg-surface-2 px-2 py-1.5 font-mono text-[10px] tracking-[0.1em] text-muted uppercase">{d}</div>
        ))}
        {cells.map((day, i) => {
          const key = day ? `${m}-${String(day).padStart(2, "0")}` : "";
          const items = key ? (byDay.get(key) ?? []) : [];
          return (
            <div key={i} className={cn("min-h-[92px] bg-surface p-1.5", !day && "bg-surface-2/60")}>
              {day ? <div className={cn("mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 font-mono text-[10.5px] tabular-nums", key === today ? "bg-fg text-bg" : "text-muted")}>{day}</div> : null}
              <div className="space-y-1">
                {items.map((p) => (
                  <Link key={p.id} href={`/admin/smm/${p.id}`} title={p.title} className={cn("block truncate rounded-sm border px-1.5 py-0.5 text-[11px] font-medium", DAY_TONE[p.status] ?? "border-transparent bg-accent-soft text-accent-soft-fg")}>
                    {fmtYerevan(p.scheduledAt ?? p.publishedAt, "time")} {p.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day list — mobile */}
      <div className="md:hidden">
        {dayKeys.length === 0 ? (
          <p className="text-sm text-muted">{L.calendar.empty}</p>
        ) : (
          <ul className="space-y-3">
            {dayKeys.map((key) => (
              <li key={key} className="rounded-md border border-line bg-surface-2 p-3">
                <div className={cn("mb-2 font-mono text-[11px] tracking-[0.06em]", key === today ? "text-accent" : "text-muted")}>
                  {fmtYerevan(`${key}T00:00:00+04:00`, "date")}
                  {key === today ? ` · ${L.calendar.today}` : ""}
                </div>
                <div className="space-y-1.5">
                  {(byDay.get(key) ?? []).map((p) => (
                    <Link key={p.id} href={`/admin/smm/${p.id}`} className={cn("flex items-center gap-2 rounded-sm border px-2 py-1.5 text-xs font-medium", DAY_TONE[p.status] ?? "border-transparent bg-accent-soft text-accent-soft-fg")}>
                      <span className="tabular-nums">{fmtYerevan(p.scheduledAt ?? p.publishedAt, "time")}</span>
                      <span className="truncate">{p.title}</span>
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
