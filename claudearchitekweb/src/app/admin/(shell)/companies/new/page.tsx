import { requireUser } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/admin/shell";
import { CompanyForm } from "@/components/admin/crm/company-form";
import { createCompanyAction } from "@/app/admin/actions/crm-actions";

export const dynamic = "force-dynamic";

export default async function NewCompanyPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="New company" subtitle="Manufacturer, studio, developer, retailer or architect." crumbs={[{ label: "Companies", href: "/admin/companies" }, { label: "New" }]} />
      <Panel className="max-w-3xl">
        <CompanyForm action={createCompanyAction} submitLabel="Create company" />
      </Panel>
    </>
  );
}
