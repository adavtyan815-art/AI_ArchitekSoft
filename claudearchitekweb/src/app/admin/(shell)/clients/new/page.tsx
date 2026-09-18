import { requireUser } from "@/lib/auth";
import { companyOptions, first } from "@/lib/admin-helpers";
import { getAdminDict } from "@/lib/i18n/admin";
import { PageHeader, Panel } from "@/components/admin/shell";
import { Notice, noticeFrom } from "@/components/admin/notice";
import { ClientForm } from "@/components/admin/crm/client-form";
import { createClientAction } from "@/app/admin/actions/crm-actions";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function NewClientPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const { t } = await getAdminDict();
  const C = t.crm.clients;
  const sp = await searchParams;
  return (
    <>
      {/* createClientAction redirects back here with ?notice=… when the form does not validate */}
      <Notice {...noticeFrom(sp)} />
      <PageHeader title={C.new} subtitle={C.newSubtitle} crumbs={[{ label: C.title, href: "/admin/clients" }, { label: t.common.new }]} />
      <Panel className="max-w-3xl">
        <ClientForm action={createClientAction} companies={companyOptions()} defaultCompanyId={first(sp.companyId) || null} submitLabel={C.create} />
      </Panel>
    </>
  );
}
