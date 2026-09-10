import { requireUser } from "@/lib/auth";
import { getAdminDict } from "@/lib/i18n/admin";
import { PageHeader, Panel } from "@/components/admin/shell";
import { CompanyForm } from "@/components/admin/crm/company-form";
import { createCompanyAction } from "@/app/admin/actions/crm-actions";

export const dynamic = "force-dynamic";

export default async function NewCompanyPage() {
  await requireUser();
  const { t } = await getAdminDict();
  const K = t.crm.companies;
  return (
    <>
      <PageHeader title={K.new} subtitle={K.newSubtitle} crumbs={[{ label: K.title, href: "/admin/companies" }, { label: t.common.new }]} />
      <Panel className="max-w-3xl">
        <CompanyForm action={createCompanyAction} submitLabel={K.create} />
      </Panel>
    </>
  );
}
