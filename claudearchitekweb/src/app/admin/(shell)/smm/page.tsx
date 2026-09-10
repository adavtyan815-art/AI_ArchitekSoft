import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { aiStatus } from "@/lib/ai";
import { PLATFORM_META, platformStatus } from "@/lib/social";
import { listPosts, smmStats, type PostRow } from "@/lib/smm-admin";
import { fmtYerevan, yerevanDay } from "@/lib/tz";
import { cn } from "@/lib/utils";
import { PageHeader, Panel, StatCard, StatusBadge } from "@/components/admin/shell";
import { Notice } from "@/components/admin/notice";
import { PlatformChip, PlatformDots } from "@/components/admin/smm/platform-chip";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/form-buttons";
import { quickActionForm } from "@/app/admin/actions/smm-actions";

export const dynamic = "force-dynamic";

const STATUS_EXPLAIN: Record<string, string> = {
  connected: "Credentials found — posts are published for real.",
  dry_run: "No credentials in .env — publishing is simulated and logged as 'simulated' (safe to test).",
  bot_only: "Bot token set, but no TELEGRAM_CHANNEL_ID — approvals work, channel posting is simulated.",
  manual: "TikTok has no automated posting (unaudited apps post privately) — the caption is prepared for manual upload.",
};

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const TABS = [
  { key: "", label: "Queue" },
  { key: "calendar", label: "Calendar" },
  { key: "drafts", label: "Drafts" },
  { key: "published", label: "Published" },
  { key: "all", label: "All" },
];

function filterPosts(posts: PostRow[], tab: string) {
  if (tab === "drafts") return posts.filter((p) => p.status === "draft");
  if (tab === "published") return posts.filter((p) => ["published", "partially_published"].includes(p.status)).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  if (tab === "all") return posts;
  return posts.filter((p) => ["awaiting_approval", "approved", "scheduled"].includes(p.status)).sort((a, b) => (a.scheduledAt ?? "9").localeCompare(b.scheduledAt ?? "9"));
}

export default async function SmmHubPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const sp = await searchParams;
  const view = first(sp.view) === "calendar" ? "calendar" : "";
  const tab = view || first(sp.tab);
  const posts = listPosts();
  const stats = smmStats();
  const statuses = platformStatus();
  const ai = aiStatus();
  const rows = filterPosts(posts, tab);
  const counts = { "": filterPosts(posts, "").length, drafts: filterPosts(posts, "drafts").length, published: filterPosts(posts, "published").length, all: posts.length };

  return (
    <>
      <PageHeader
        title="SMM hub"
        subtitle="Generate, review, approve and publish posts. Times are shown in Asia/Yerevan."
        actions={
          <Link href="/admin/smm/new" className="btn-primary btn-sm">
            <Plus size={14} /> New post
          </Link>
        }
      />
      <Notice text={sp.notice} tone={sp.tone} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Awaiting approval" value={stats.awaiting} tone={stats.awaiting ? "warning" : undefined} hint="Approve in Telegram or here" />
        <StatCard label="Scheduled" value={stats.scheduled} hint="scheduled + approved" tone={stats.scheduled ? "brand" : undefined} />
        <StatCard label="Published (30d)" value={stats.published30} tone={stats.published30 ? "success" : undefined} />
        <StatCard label="Failed" value={stats.failed} tone={stats.failed ? "danger" : undefined} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-4 py-3">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Connections</span>
        {Object.entries(statuses).map(([p, st]) => (
          <PlatformChip key={p} platform={p} meta={PLATFORM_META[p]} status={st} title={STATUS_EXPLAIN[st] ?? st} />
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-2.5 py-1 text-xs" title={ai.provider === "template" ? "No ANTHROPIC_API_KEY / GEMINI_API_KEY — copy is generated from built-in trilingual templates." : `AI copywriting via ${ai.provider} (${ai.model})`}>
          <span className={cn("h-2 w-2 rounded-full", ai.provider === "template" ? "bg-amber-500" : "bg-green-500")} />
          AI: <b className="font-semibold">{ai.provider}</b> <span className="text-ink-500">· {ai.model}</span>
        </span>
        <p className="w-full text-xs text-ink-500">
          <b className="font-semibold">dry-run</b> = no credentials in <code>.env</code>; the adapter simulates the call and records the variant as <i>simulated</i>. Configure keys in <Link href="/admin/settings?tab=integrations" className="text-brand-600">Settings → Integrations</Link>.
        </p>
      </div>

      <div className="mt-6 mb-5 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => {
          const href = t.key === "calendar" ? "/admin/smm?view=calendar" : t.key ? `/admin/smm?tab=${t.key}` : "/admin/smm";
          const active = tab === t.key;
          const count = counts[t.key as keyof typeof counts];
          return (
            <Link key={t.key} href={href} className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", active ? "border-ink-950 text-ink-950" : "border-transparent text-ink-500 hover:text-ink-900")}>
              {t.label}
              {typeof count === "number" ? <span className="ml-1.5 rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600">{count}</span> : null}
            </Link>
          );
        })}
      </div>

      {view === "calendar" ? <Calendar posts={posts} month={first(sp.month)} /> : <PostTable rows={rows} tab={tab} />}
    </>
  );
}

function PostTable({ rows, tab }: { rows: PostRow[]; tab: string }) {
  if (rows.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center p-10 text-center">
        <div className="text-base font-semibold text-ink-900">{tab === "" ? "The queue is empty" : "Nothing here yet"}</div>
        <div className="mt-1 max-w-md text-sm text-ink-500">Create a post from a project: pick renders, choose a goal and the AI (or templates) writes a variant per platform.</div>
        <Link href="/admin/smm/new" className="btn-primary btn-sm mt-4">New post</Link>
      </div>
    );
  }
  return (
    <div className="card overflow-x-auto">
      <table className="table-admin">
        <thead>
          <tr>
            <th>Post</th>
            <th>Project</th>
            <th>Lang</th>
            <th>Platforms</th>
            <th>{tab === "published" ? "Published" : "Scheduled"} (Yerevan)</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/admin/smm/${p.id}`} className="font-medium text-ink-900 hover:text-brand-600">{p.title}</Link>
                <div className="text-xs text-ink-500">{p.goal.replace("_", " ")}</div>
              </td>
              <td className="text-xs">{p.projectId ? <Link href={`/admin/projects/${p.projectId}`} className="text-ink-700 hover:text-brand-600">{p.projectCode} · {p.projectTitle}</Link> : <span className="text-ink-400">—</span>}</td>
              <td className="uppercase text-xs font-semibold text-ink-600">{p.language}</td>
              <td><PlatformDots variants={p.variants} metaMap={PLATFORM_META} /></td>
              <td className="whitespace-nowrap text-xs">{tab === "published" ? fmtYerevan(p.publishedAt) : fmtYerevan(p.scheduledAt)}</td>
              <td><StatusBadge value={p.status} /></td>
              <td>
                <div className="flex flex-wrap justify-end gap-1">
                  {["draft", "scheduled"].includes(p.status) ? (
                    <form action={quickActionForm}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="op" value="approval" />
                      <SubmitButton variant="secondary" className="btn-sm" pendingText="Sending…">Send for approval</SubmitButton>
                    </form>
                  ) : null}
                  {p.status === "awaiting_approval" ? (
                    <form action={quickActionForm}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="op" value="approve" />
                      <SubmitButton variant="secondary" className="btn-sm" pendingText="…">Approve</SubmitButton>
                    </form>
                  ) : null}
                  {!["published", "publishing", "cancelled"].includes(p.status) ? (
                    <form action={quickActionForm}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="op" value="publish" />
                      <SubmitButton variant="primary" className="btn-sm" pendingText="Publishing…">Publish now</SubmitButton>
                    </form>
                  ) : null}
                  {!["published", "cancelled"].includes(p.status) ? (
                    <form action={quickActionForm}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="op" value="cancel" />
                      <ConfirmSubmit message={`Cancel "${p.title}"?`}>Cancel</ConfirmSubmit>
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

function Calendar({ posts, month }: { posts: PostRow[]; month: string }) {
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
  const label = firstDay.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <Panel
      title={label}
      actions={
        <div className="flex items-center gap-1">
          <Link href={`/admin/smm?view=calendar&month=${prev}`} className="btn-ghost btn-sm">← Prev</Link>
          <Link href="/admin/smm?view=calendar" className="btn-ghost btn-sm">Today</Link>
          <Link href={`/admin/smm?view=calendar&month=${next}`} className="btn-ghost btn-sm">Next →</Link>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-ink-50 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">{d}</div>
        ))}
        {cells.map((day, i) => {
          const key = day ? `${m}-${String(day).padStart(2, "0")}` : "";
          const items = key ? byDay.get(key) ?? [] : [];
          return (
            <div key={i} className={cn("min-h-[92px] bg-white p-1.5", !day && "bg-ink-50/60")}>
              {day ? <div className={cn("mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold", key === today ? "bg-ink-950 text-white" : "text-ink-500")}>{day}</div> : null}
              <div className="space-y-1">
                {items.map((p) => (
                  <Link key={p.id} href={`/admin/smm/${p.id}`} title={`${p.title} · ${p.status}`} className={cn("block truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium", p.status === "published" ? "border-green-200 bg-green-50 text-green-800" : p.status === "awaiting_approval" ? "border-amber-200 bg-amber-50 text-amber-800" : p.status === "failed" || p.status === "cancelled" ? "border-red-200 bg-red-50 text-red-800" : "border-brand-200 bg-brand-50 text-brand-800")}>
                    {fmtYerevan(p.scheduledAt ?? p.publishedAt, "time")} {p.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
