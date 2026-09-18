import { requireUser } from "@/lib/auth";
import { getAdminDict } from "@/lib/i18n/admin";
import { PageHeader, Panel } from "@/components/admin/shell";
import { Notice, noticeFrom } from "@/components/admin/notice";
import { LeadForm } from "@/components/admin/crm/lead-form";
import { createLeadAction } from "@/app/admin/actions/crm-actions";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function NewLeadPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const { t } = await getAdminDict();
  const L = t.crm.leads;
  const sp = await searchParams;
  return (
    <>
      {/* createLeadAction redirects back here with ?notice=… when the form does not validate */}
      <Notice {...noticeFrom(sp)} />
      <PageHeader title={L.new} subtitle={L.newSubtitle} crumbs={[{ label: L.title, href: "/admin/leads" }, { label: t.common.new }]} />
      <Panel className="max-w-3xl">
        <LeadForm action={createLeadAction} submitLabel={L.create} />
      </Panel>
    </>
  );
}
