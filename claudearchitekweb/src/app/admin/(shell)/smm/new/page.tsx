import { requireUser } from "@/lib/auth";
import { PLATFORMS, aiStatus } from "@/lib/ai";
import { PLATFORM_META } from "@/lib/social";
import { listMediaAssetsLite, listProjectsLite } from "@/lib/smm-admin";
import { getSetting } from "@/lib/settings";
import { getAdminDict } from "@/lib/i18n/admin";
import { PageHeader } from "@/components/admin/shell";
import { Composer } from "@/components/admin/smm/composer";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  await requireUser();
  const { t } = await getAdminDict();
  const L = t.smm.composer;
  const projects = listProjectsLite();
  const assets = listMediaAssetsLite(300);
  const smm = getSetting("smm");
  const brand = getSetting("brand");
  const ai = aiStatus();

  return (
    <>
      <PageHeader crumbs={[{ label: t.smm.title, href: "/admin/smm" }, { label: L.title }]} title={L.title} subtitle={L.subtitle} />
      <Composer
        projects={projects.map((p) => ({ id: p.id, code: p.code, title: p.title, type: p.type, segment: p.segment, coverUrl: p.coverUrl }))}
        assets={assets.map((a) => ({ id: a.id, name: a.name, kind: a.kind, mime: a.mime, projectId: a.projectId, thumbUrl: a.thumbUrl, durationSec: a.durationSec }))}
        metaMap={PLATFORM_META}
        platforms={[...PLATFORMS]}
        defaults={{ platforms: smm.defaultPlatforms, language: brand.defaultLanguage }}
        ai={{ provider: ai.provider, model: ai.provider === "template" ? t.smm.templatesModel : ai.model }}
        labels={L}
        goalLabels={t.goals}
      />
    </>
  );
}
