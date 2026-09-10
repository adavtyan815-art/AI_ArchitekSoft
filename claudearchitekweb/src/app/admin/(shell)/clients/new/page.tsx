import { requireUser } from "@/lib/auth";
import { companyOptions } from "@/lib/admin-helpers";
import { getAdminDict } from "@/lib/i18n/admin";
import { PageHeader, Panel } from "@/components/admin/shell";
import { ClientForm } from "@/components/admin/crm/client-form";
import { createClientAction } from "@/app/admin/actions/crm-actions";

export const dynamic = "force-dynamic";

export default async function NewClientPage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) {
  await requireUser();
  const { t } = await getAdminDict();
  const C = t.crm.clients;
  const sp = await searchParams;
  return (
    <>
      <PageHeader title={C.new} subtitle={C.newSubtitle} crumbs={[{ label: C.title, href: "/admin/clients" }, { label: t.common.new }]} />
      <Panel className="max-w-3xl">
        <ClientForm action={createClientAction} companies={companyOptions()} defaultCompanyId={sp.companyId ?? null} submitLabel={C.create} />
      </Panel>
    </>
  );
}
