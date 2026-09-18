import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getPostFull } from "@/lib/smm";
import { notesForDisplay, suggestedSlotOf } from "@/lib/inbox";
import { hashtagsOf, listMediaAssetsLite, telegramThreadsFor, toAssetLite } from "@/lib/smm-admin";
import { PLATFORM_META, platformStatus } from "@/lib/social";
import { fmtYerevan, toYerevanInput } from "@/lib/tz";
import { getSetting } from "@/lib/settings";
import { telegramEnabled } from "@/lib/telegram";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { KV, PageHeader, Panel, StatusBadge } from "@/components/admin/shell";
import { Notice } from "@/components/admin/notice";
import { PlatformChip } from "@/components/admin/smm/platform-chip";
import { PostEditor, type EditorVariant } from "@/components/admin/smm/post-editor";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function PostEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const L = t.smm.editor;
  const { id } = await params;
  const sp = await searchParams;
  const full = getPostFull(id);
  if (!full) notFound();
  const { post, project } = full;

  const attached = full.assets.map((a) => toAssetLite(a));
  // Filtered by project in SQL (before the limit) and always including what is already attached,
  // so an older project's media stays pickable and current selections never drop out.
  const library = listMediaAssetsLite(200, { projectId: post.projectId, includeIds: attached.map((a) => a.id), perProject: 60 });
  const threads = telegramThreadsFor(id);
  const tg = getSetting("telegram");
  const brand = getSetting("brand");
  const tgReady = telegramEnabled() && !!tg.adminChatId;
  const statuses = platformStatus() as Record<string, string>;

  // A post the drop folder prepared: the banner names the folder and offers the slot it proposed.
  const suggestedSlot = post.source === "inbox" ? suggestedSlotOf(post.notes) : null;
  const inbox =
    post.source === "inbox"
      ? { folder: post.sourceRef ?? "—", suggestedSlot, suggestedLabel: suggestedSlot ? `${fmtYerevan(suggestedSlot, "datetime", locale)} (${L.tz})` : null }
      : null;

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
        crumbs={[{ label: t.smm.title, href: "/admin/smm" }, { label: post.title }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {post.title}
            <StatusBadge value={post.status} label={labelFor(t, "postStatus", post.status)} />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="uppercase">{post.language}</span>
            <span>· {labelFor(t, "goals", post.goal)}</span>
            {project ? (
              <>
                <span>·</span>
                <Link href={`/admin/projects/${project.id}`} className="text-accent hover:underline">{project.code} · {project.title}</Link>
              </>
            ) : null}
            <span className="num text-[12px]">· {L.createdAt} {fmtYerevan(post.createdAt)}</span>
          </span>
        }
        actions={<Link href="/admin/smm" className="btn-secondary btn-sm">{L.backToHub}</Link>}
      />
      <Notice text={sp.notice} tone={sp.tone} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:gap-0">
        <PostEditor
          post={{ id: post.id, title: post.title, goal: post.goal as never, language: post.language as never, status: post.status, scheduledLocal: toYerevanInput(post.scheduledAt), notes: post.notes }}
          variants={variants}
          assets={attached.map((a) => ({ id: a.id, name: a.name, kind: a.kind, mime: a.mime, projectId: a.projectId, thumbUrl: a.thumbUrl, url: a.url, width: a.width, height: a.height, durationSec: a.durationSec }))}
          library={library.map((a) => ({ id: a.id, name: a.name, kind: a.kind, mime: a.mime, projectId: a.projectId, thumbUrl: a.thumbUrl, url: a.url, width: a.width, height: a.height, durationSec: a.durationSec }))}
          metaMap={PLATFORM_META}
          labels={L}
          actionLabels={t.smm.act}
          goalLabels={t.goals}
          variantStatusLabels={t.variantStatus}
          postStatusLabels={t.postStatus}
          platformsWord={t.smm.table.platforms}
          brandName={brand.name}
          inbox={inbox}
        />

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:ml-6 lg:self-start lg:border-l lg:border-line lg:pl-6">
          <Panel title={L.state}>
            <div className="divide-y divide-line">
              <KV label={t.common.status}><StatusBadge value={post.status} label={labelFor(t, "postStatus", post.status)} /></KV>
              <KV label={L.scheduled}><span className="num">{fmtYerevan(post.scheduledAt)}</span></KV>
              <KV label={L.approvalSent}><span className="num">{fmtYerevan(post.approvalSentAt)}</span></KV>
              <KV label={L.approvedAt}><span className="num">{fmtYerevan(post.approvedAt)}</span></KV>
              <KV label={L.publishedAt}><span className="num">{fmtYerevan(post.publishedAt)}</span></KV>
            </div>
            {/* whitespace-pre-line: the import writes one warning per line, and they must stay apart. */}
            {notesForDisplay(post.notes) ? (
              <p className="mt-3 rounded-sm border border-warning/30 bg-warning-soft px-3 py-2 text-[12px] whitespace-pre-line text-warning">{notesForDisplay(post.notes)}</p>
            ) : null}
          </Panel>

          <Panel title={L.publishLog}>
            <ul className="space-y-3 text-xs">
              {full.variants.map((v) => (
                <li key={v.id} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PlatformChip platform={v.platform} meta={PLATFORM_META[v.platform]} status={v.status} statusLabel={labelFor(t, "variantStatus", v.status)} />
                    {!v.enabled ? <span className="text-faint">{L.off}</span> : null}
                    <span className="ml-auto font-mono text-[10px] tracking-[0.06em] text-faint uppercase">{labelFor(t, "connection", statuses[v.platform])}</span>
                  </div>
                  {v.externalUrl ? (
                    <a href={v.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                      <ExternalLink size={11} /> {v.externalUrl.slice(0, 44)}
                    </a>
                  ) : null}
                  {v.error ? <p className="text-fg-2">{v.error}</p> : null}
                  {v.publishedAt ? <p className="num text-[11px] text-faint">{fmtYerevan(v.publishedAt)}</p> : null}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title={L.telegramApproval}>
            <p className="text-xs text-muted">
              {tgReady ? (
                <>
                  {L.tgReady} <code className="font-mono">{tg.adminChatId}</code>. {L.tgReady2}
                </>
              ) : (
                <>
                  {L.tgNot} <Link href="/admin/settings?tab=telegram" className="inline-flex min-h-11 items-center font-medium text-accent hover:underline">{L.tgSettingsLink}</Link>
                </>
              )}
            </p>
            {threads.length ? (
              <ul className="mt-3 space-y-1.5 text-xs">
                {threads.map((th) => (
                  <li key={th.id} className="flex items-center justify-between gap-2">
                    <StatusBadge value={th.state} label={labelFor(t, "postStatus", th.state)} />
                    <span className="num text-[10.5px] text-faint">{L.msgLabel} {th.messageId ?? "—"} · {fmtYerevan(th.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-faint">{L.noThread}</p>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
