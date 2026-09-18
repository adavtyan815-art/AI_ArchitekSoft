import { Button, Field, Input, Textarea } from "@/components/ui";
import { FormActions } from "@/components/admin/shell";
import { FormSelect } from "@/components/admin/form-select";
import { COMPANY_TYPES, LEAD_SOURCES } from "@/lib/crm";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { parseJson } from "@/lib/utils";
import type { Company } from "@/lib/db/schema";

const STATUSES = ["prospect", "active", "partner", "inactive"];

/** Create / edit form for a B2B company. Server component — pass the server action. */
export async function CompanyForm({ company, action, submitLabel }: { company?: Company | null; action: (fd: FormData) => Promise<void>; submitLabel?: string }) {
  const { t } = await getAdminDict();
  const f = t.crm.form;
  const tags = parseJson<string[]>(company?.tags, []).join(", ");
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {company ? <input type="hidden" name="id" value={company.id} /> : null}
      {/* maxLength mirrors the server limits in crm-actions.ts, so nothing is silently truncated. */}
      <Field label={f.companyTitle} required>
        <Input name="name" required maxLength={120} defaultValue={company?.name ?? ""} placeholder={f.companyTitlePlaceholder} />
      </Field>
      <Field label={f.type} required>
        <FormSelect name="type" value={company?.type ?? "manufacturer"}>
          {COMPANY_TYPES.map((ty) => (
            <option key={ty} value={ty}>
              {labelFor(t, "companyTypes", ty)}
            </option>
          ))}
        </FormSelect>
      </Field>
      <Field label={f.phone}>
        <Input name="phone" maxLength={40} defaultValue={company?.phone ?? ""} placeholder="+374 …" />
      </Field>
      <Field label={f.email}>
        <Input name="email" type="email" maxLength={120} defaultValue={company?.email ?? ""} />
      </Field>
      <Field label={f.website}>
        <Input name="website" maxLength={200} defaultValue={company?.website ?? ""} placeholder="https://…" />
      </Field>
      <Field label={f.status}>
        <FormSelect name="status" value={company?.status ?? "active"}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {labelFor(t, "companyStatus", s)}
            </option>
          ))}
        </FormSelect>
      </Field>
      <Field label={f.city}>
        <Input name="city" maxLength={80} defaultValue={company?.city ?? ""} placeholder={f.cityPlaceholder} />
      </Field>
      <Field label={f.country} hint={f.countryHint}>
        <Input name="country" maxLength={4} defaultValue={company?.country ?? "AM"} placeholder="AM" />
      </Field>
      <Field label={f.taxId}>
        <Input name="taxId" maxLength={40} defaultValue={company?.taxId ?? ""} />
      </Field>
      <Field label={f.source}>
        <FormSelect name="source" value={company?.source ?? ""}>
          <option value="">{f.none}</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {labelFor(t, "leadSources", s)}
            </option>
          ))}
        </FormSelect>
      </Field>
      <Field label={f.address} className="sm:col-span-2">
        <Input name="address" maxLength={200} defaultValue={company?.address ?? ""} />
      </Field>
      <Field label={f.tags} hint={f.tagsHint} className="sm:col-span-2">
        <Input name="tags" defaultValue={tags} placeholder={f.companyTagsPlaceholder} />
      </Field>
      <Field label={f.notes} className="sm:col-span-2">
        <Textarea name="notes" maxLength={4000} defaultValue={company?.notes ?? ""} placeholder={f.companyNotesPlaceholder} />
      </Field>
      <FormActions className="sm:col-span-2">
        <Button type="submit">{submitLabel ?? t.common.save}</Button>
      </FormActions>
    </form>
  );
}
