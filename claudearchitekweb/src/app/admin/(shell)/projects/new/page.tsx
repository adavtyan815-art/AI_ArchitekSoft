import { requireUser } from "@/lib/auth";
import { PROJECT_TYPES } from "@/lib/crm";
import { clientLabel, clientOptions, companyOptions } from "@/lib/admin-helpers";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { FormActions, PageHeader, Panel } from "@/components/admin/shell";
import { Notice } from "@/components/admin/notice";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { createProjectAction } from "@/app/admin/actions/project-actions";

export const dynamic = "force-dynamic";

const CURRENCIES = ["AMD", "USD", "EUR", "RUB"];

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ clientId?: string; companyId?: string; notice?: string; tone?: string }> }) {
  await requireUser();
  const { t } = await getAdminDict();
  const P = t.projects;
  const f = t.crm.form;
  const sp = await searchParams;
  const clients = clientOptions();
  const companies = companyOptions();
  return (
    <>
      {/* createProjectAction redirects back here with ?notice=… when the form does not validate */}
      <Notice text={sp.notice} tone={sp.tone} />
      <PageHeader title={P.new} subtitle={P.newSubtitle} crumbs={[{ label: P.title, href: "/admin/projects" }, { label: t.common.new }]} />
      <Panel className="max-w-3xl">
        <form action={createProjectAction} className="grid gap-4 sm:grid-cols-2">
          <Field label={P.fTitle} required className="sm:col-span-2">
            <Input name="title" required placeholder={P.fTitlePlaceholder} maxLength={160} />
          </Field>
          <Field label={f.segment} required>
            <Select name="segment" defaultValue={sp.companyId ? "b2b" : "b2c"}>
              <option value="b2c">{f.b2cOption}</option>
              <option value="b2b">{f.b2bOption}</option>
            </Select>
          </Field>
          <Field label={f.type} required>
            <Select name="type" defaultValue="kitchen">
              {PROJECT_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {labelFor(t, "rooms", ty)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.crm.leads.client}>
            <Select name="clientId" defaultValue={sp.clientId ?? ""}>
              <option value="">{f.none}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {clientLabel(c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={f.company}>
            <Select name="companyId" defaultValue={sp.companyId ?? ""}>
              <option value="">{f.none}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={P.fQuote}>
            <Input name="quoteAmount" inputMode="numeric" placeholder="0" />
          </Field>
          <Field label={f.currency}>
            <Select name="currency" defaultValue="AMD">
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.common.description} className="sm:col-span-2">
            <Textarea name="description" placeholder={P.descriptionPlaceholder} />
          </Field>
          <FormActions className="sm:col-span-2">
            <Button type="submit">{P.create}</Button>
          </FormActions>
        </form>
      </Panel>
    </>
  );
}
