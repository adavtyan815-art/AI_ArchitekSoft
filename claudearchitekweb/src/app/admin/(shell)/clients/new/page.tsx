import { requireUser } from "@/lib/auth";
import { companyOptions } from "@/lib/admin-helpers";
import { PageHeader, Panel } from "@/components/admin/shell";
import { ClientForm } from "@/components/admin/crm/client-form";
import { createClientAction } from "@/app/admin/actions/crm-actions";

export const dynamic = "force-dynamic";

export default async function NewClientPage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="New client" subtitle="An individual customer, or a contact person inside a partner company." crumbs={[{ label: "Clients", href: "/admin/clients" }, { label: "New" }]} />
      <Panel className="max-w-3xl">
        <ClientForm action={createClientAction} companies={companyOptions()} defaultCompanyId={sp.companyId ?? null} submitLabel="Create client" />
      </Panel>
    </>
  );
}
