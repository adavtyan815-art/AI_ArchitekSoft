import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getPostFull } from "@/lib/smm";
import { hashtagsOf, listMediaAssetsLite, telegramThreadsFor, toAssetLite } from "@/lib/smm-admin";
import { PLATFORM_META, platformStatus } from "@/lib/social";
import { fmtYerevan, toYerevanInput } from "@/lib/tz";
import { getSetting } from "@/lib/settings";
import { telegramEnabled } from "@/lib/telegram";
import { KV, PageHeader, Panel, StatusBadge } from "@/components/admin/shell";
import { Notice } from "@/components/admin/notice";
import { PlatformChip } from "@/components/admin/smm/platform-chip";
import { PostEditor, type EditorVariant } from "@/components/admin/smm/post-editor";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function PostEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const full = getPostFull(id);
  if (!full) notFound();
  const { post, project } = full;

  const attached = full.assets.map((a) => toAssetLite(a));
  const library = listMediaAssetsLite(200).filter((a) => (post.projectId ? a.projectId === post.projectId || a.projectId === null : true));
  const threads = telegramThreadsFor(id);
  const tg = getSetting("telegram");
  const tgReady = telegramEnabled() && !!tg.adminChatId;
  const statuses = platformStatus() as Record<string, string>;

  const variants: EditorVariant[] = [...full.variants]
    .sort((a, b) => a.platform.localeCompare(b.platform))
    .map((v) => ({
      id: v.id,
      platform: v.platform,
      enabled: v.enabled,
      title: v.title ?? "",
      text: v.text,
      hashtags: hashtagsOf(v).join(" "),
      cta: v.cta ?? "",
      format: v.format as EditorVariant["format"],
      status: v.status,
      externalUrl: v.externalUrl,
      error: v.error,
    }));

  return (
    <>
      <PageHeader
        crumbs={[{ label: "SMM", href: "/admin/smm" }, { label: post.title }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {post.title}
            <StatusBadge value={post.status} />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="uppercase">{post.language}</span>
            <span>· {post.goal.replace("_", " ")}</span>
            {project ? (
              <>
                <span>·</span>
                <Link href={`/admin/projects/${project.id}`} className="text-brand-600 hover:underline">{project.code} · {project.title}</Link>
              </>
            ) : null}
            <span>· created {fmtYerevan(post.createdAt)}</span>
          </span>
        }
        actions={<Link href="/admin/smm" className="btn-secondary btn-sm">Back to hub</Link>}
      />
      <Notice text={sp.notice} tone={sp.tone} />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <PostEditor
          post={{ id: post.id, title: post.title, goal: post.goal as never, language: post.language as never, status: post.status, scheduledLocal: toYerevanInput(post.scheduledAt), notes: post.notes }}
          variants={variants}
          assets={attached.map((a) => ({ id: a.id, name: a.name, kind: a.kind, mime: a.mime, projectId: a.projectId, thumbUrl: a.thumbUrl }))}
          library={library.map((a) => ({ id: a.id, name: a.name, kind: a.kind, mime: a.mime, projectId: a.projectId, thumbUrl: a.thumbUrl }))}
          metaMap={PLATFORM_META}
        />

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Panel title="State">
            <div className="divide-y divide-line">
              <KV label="Status"><StatusBadge value={post.status} /></KV>
              <KV label="Scheduled">{fmtYerevan(post.scheduledAt)}</KV>
              <KV label="Approval sent">{fmtYerevan(post.approvalSentAt)}</KV>
              <KV label="Approved">{fmtYerevan(post.approvedAt)}</KV>
              <KV label="Published">{fmtYerevan(post.publishedAt)}</KV>
            </div>
            {post.notes ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{post.notes}</p> : null}
          </Panel>

          <Panel title="Publish log">
            <ul className="space-y-3 text-xs">
              {full.variants.map((v) => (
                <li key={v.id} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PlatformChip platform={v.platform} meta={PLATFORM_META[v.platform]} status={v.status} />
                    {!v.enabled ? <span className="text-ink-400">off</span> : null}
                    <span className="ml-auto text-ink-400">{statuses[v.platform] === "dry_run" ? "dry-run" : statuses[v.platform]}</span>
                  </div>
                  {v.externalUrl ? (
                    <a href={v.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                      <ExternalLink size={11} /> {v.externalUrl.slice(0, 44)}
                    </a>
                  ) : null}
                  {v.error ? <p className="text-ink-600">{v.error}</p> : null}
                  {v.publishedAt ? <p className="text-ink-400">{fmtYerevan(v.publishedAt)}</p> : null}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Telegram approval">
            <p className="text-xs text-ink-500">
              {tgReady ? (
                <>Bot connected, admin chat <code>{tg.adminChatId}</code>. The preview carries Approve / Edit / Skip buttons.</>
              ) : (
                <>No <code>TELEGRAM_BOT_TOKEN</code> or admin chat id — approvals run as a dry-run: the post is marked <i>awaiting approval</i> and you approve it here. Configure it in <Link href="/admin/settings?tab=telegram" className="text-brand-600">Settings → Telegram</Link>.</>
              )}
            </p>
            {threads.length ? (
              <ul className="mt-3 space-y-1.5 text-xs">
                {threads.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <StatusBadge value={t.state} />
                    <span className="text-ink-400">msg {t.messageId ?? "—"} · {fmtYerevan(t.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-ink-400">No Telegram thread yet.</p>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
