import { requireUser } from "@/lib/auth";
import { PLATFORMS, aiStatus } from "@/lib/ai";
import { PLATFORM_META } from "@/lib/social";
import { listMediaAssetsLite, listProjectsLite } from "@/lib/smm-admin";
import { getSetting } from "@/lib/settings";
import { PageHeader } from "@/components/admin/shell";
import { Composer } from "@/components/admin/smm/composer";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  await requireUser();
  const projects = listProjectsLite();
  const assets = listMediaAssetsLite(300);
  const smm = getSetting("smm");
  const brand = getSetting("brand");
  const ai = aiStatus();

  return (
    <>
      <PageHeader
        crumbs={[{ label: "SMM", href: "/admin/smm" }, { label: "New post" }]}
        title="New post"
        subtitle="Pick a project and its renders, choose the goal — the copywriter writes one variant per platform."
      />
      <Composer
        projects={projects.map((p) => ({ id: p.id, code: p.code, title: p.title, type: p.type, segment: p.segment, coverUrl: p.coverUrl }))}
        assets={assets.map((a) => ({ id: a.id, name: a.name, kind: a.kind, mime: a.mime, projectId: a.projectId, thumbUrl: a.thumbUrl, durationSec: a.durationSec }))}
        metaMap={PLATFORM_META}
        platforms={[...PLATFORMS]}
        defaults={{ platforms: smm.defaultPlatforms, language: brand.defaultLanguage }}
        ai={{ provider: ai.provider, model: ai.model }}
      />
    </>
  );
}
