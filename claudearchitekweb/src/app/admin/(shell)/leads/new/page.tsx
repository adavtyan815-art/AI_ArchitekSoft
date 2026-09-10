import { requireUser } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/admin/shell";
import { LeadForm } from "@/components/admin/crm/lead-form";
import { createLeadAction } from "@/app/admin/actions/crm-actions";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="New lead" subtitle="Manual entry for phone calls, walk-ins and messages." crumbs={[{ label: "Leads", href: "/admin/leads" }, { label: "New" }]} />
      <Panel className="max-w-3xl">
        <LeadForm action={createLeadAction} submitLabel="Create lead" />
      </Panel>
    </>
  );
}
