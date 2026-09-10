import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { COMPANY_TYPES, LEAD_SOURCES } from "@/lib/crm";
import { parseJson } from "@/lib/utils";
import type { Company } from "@/lib/db/schema";

const STATUSES = ["prospect", "active", "partner", "inactive"];

/** Create / edit form for a B2B company. Server component — pass the server action. */
export function CompanyForm({ company, action, submitLabel = "Save" }: { company?: Company | null; action: (fd: FormData) => Promise<void>; submitLabel?: string }) {
  const tags = parseJson<string[]>(company?.tags, []).join(", ");
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {company ? <input type="hidden" name="id" value={company.id} /> : null}
      <Field label="Company name" required>
        <Input name="name" required defaultValue={company?.name ?? ""} placeholder="Wood Dreams LLC" />
      </Field>
      <Field label="Type" required>
        <Select name="type" defaultValue={company?.type ?? "manufacturer"}>
          {COMPANY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Phone">
        <Input name="phone" defaultValue={company?.phone ?? ""} placeholder="+374 …" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={company?.email ?? ""} />
      </Field>
      <Field label="Website">
        <Input name="website" defaultValue={company?.website ?? ""} placeholder="https://…" />
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue={company?.status ?? "active"}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="City">
        <Input name="city" defaultValue={company?.city ?? ""} placeholder="Yerevan" />
      </Field>
      <Field label="Country">
        <Input name="country" maxLength={4} defaultValue={company?.country ?? "AM"} />
      </Field>
      <Field label="Tax ID">
        <Input name="taxId" defaultValue={company?.taxId ?? ""} />
      </Field>
      <Field label="Source">
        <Select name="source" defaultValue={company?.source ?? ""}>
          <option value="">—</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Address" className="sm:col-span-2">
        <Input name="address" defaultValue={company?.address ?? ""} />
      </Field>
      <Field label="Tags" hint="Comma separated" className="sm:col-span-2">
        <Input name="tags" defaultValue={tags} placeholder="oem, partner, exhibition" />
      </Field>
      <Field label="Notes" className="sm:col-span-2">
        <Textarea name="notes" defaultValue={company?.notes ?? ""} placeholder="Capacity, terms, decision makers…" />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
