import { requireUser } from "@/lib/auth";
import { PROJECT_TYPES } from "@/lib/crm";
import { clientLabel, clientOptions, companyOptions } from "@/lib/admin-helpers";
import { PageHeader, Panel } from "@/components/admin/shell";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { createProjectAction } from "@/app/admin/actions/project-actions";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ clientId?: string; companyId?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const clients = clientOptions();
  const companies = companyOptions();
  return (
    <>
      <PageHeader title="New project" subtitle="Create a job manually — or convert a lead to keep the whole history." crumbs={[{ label: "Projects", href: "/admin/projects" }, { label: "New" }]} />
      <Panel className="max-w-3xl">
        <form action={createProjectAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required className="sm:col-span-2">
            <Input name="title" required placeholder="Aren — living room TV wall & storage" maxLength={160} />
          </Field>
          <Field label="Segment" required>
            <Select name="segment" defaultValue={sp.companyId ? "b2b" : "b2c"}>
              <option value="b2c">B2C — individual</option>
              <option value="b2b">B2B — company</option>
            </Select>
          </Field>
          <Field label="Type" required>
            <Select name="type" defaultValue="kitchen">
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Client">
            <Select name="clientId" defaultValue={sp.clientId ?? ""}>
              <option value="">—</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {clientLabel(c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Company">
            <Select name="companyId" defaultValue={sp.companyId ?? ""}>
              <option value="">—</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quote amount">
            <Input name="quoteAmount" inputMode="numeric" placeholder="0" />
          </Field>
          <Field label="Currency">
            <Select name="currency" defaultValue="AMD">
              <option value="AMD">AMD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="RUB">RUB</option>
            </Select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea name="description" placeholder="Scope, style, dimensions, constraints…" />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit">Create project</Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
