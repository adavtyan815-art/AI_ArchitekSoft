import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { FormActions } from "@/components/admin/shell";
import { LEAD_SOURCES } from "@/lib/crm";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import type { Lead } from "@/lib/db/schema";

const SERVICES = ["kitchenpro", "showroom", "ar", "cnc", "real_estate", "custom", "other"];
const ROOMS = ["kitchen", "wardrobe", "living", "bathroom", "office", "apartment", "other"];
const CURRENCIES = ["AMD", "USD", "EUR", "RUB"];

/** Create / edit form for a lead. Server component — pass the server action. */
export async function LeadForm({ lead, action, submitLabel }: { lead?: Lead | null; action: (fd: FormData) => Promise<void>; submitLabel?: string }) {
  const { t } = await getAdminDict();
  const f = t.crm.form;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {lead ? <input type="hidden" name="id" value={lead.id} /> : null}
      <Field label={f.segment} required>
        <Select name="segment" defaultValue={lead?.segment ?? "b2c"}>
          <option value="b2c">{f.b2cOption}</option>
          <option value="b2b">{f.b2bOption}</option>
        </Select>
      </Field>
      {!lead ? (
        <Field label={f.source} required>
          <Select name="source" defaultValue="phone">
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {labelFor(t, "leadSources", s)}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label={f.assignedTo}>
          <Input name="assignedTo" defaultValue={lead.assignedTo ?? ""} placeholder={f.assignedToPlaceholder} />
        </Field>
      )}
      <Field label={f.name} required>
        <Input name="name" required defaultValue={lead?.name ?? ""} placeholder={f.namePlaceholder} />
      </Field>
      <Field label={f.companyName}>
        <Input name="companyName" defaultValue={lead?.companyName ?? ""} />
      </Field>
      <Field label={f.phone}>
        <Input name="phone" defaultValue={lead?.phone ?? ""} placeholder="+374 …" />
      </Field>
      <Field label={f.telegram}>
        <Input name="telegram" defaultValue={lead?.telegram ?? ""} placeholder="@username" />
      </Field>
      <Field label={f.email}>
        <Input name="email" type="email" defaultValue={lead?.email ?? ""} />
      </Field>
      <Field label={f.preferredChannel}>
        <Select name="preferredChannel" defaultValue={lead?.preferredChannel ?? ""}>
          <option value="">{f.none}</option>
          <option value="phone">{f.channelPhone}</option>
          <option value="telegram">{f.telegram}</option>
          <option value="whatsapp">{f.whatsapp}</option>
          <option value="email">{f.email}</option>
        </Select>
      </Field>
      <Field label={f.service}>
        <Select name="service" defaultValue={lead?.service ?? ""}>
          <option value="">{f.none}</option>
          {SERVICES.map((s) => (
            <option key={s} value={s}>
              {labelFor(t, "services", s)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={f.room}>
        <Select name="roomType" defaultValue={lead?.roomType ?? ""}>
          <option value="">{f.none}</option>
          {ROOMS.map((s) => (
            <option key={s} value={s}>
              {labelFor(t, "rooms", s)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={f.language}>
        <Select name="language" defaultValue={lead?.language ?? "hy"}>
          <option value="hy">{f.langHy}</option>
          <option value="ru">{f.langRu}</option>
          <option value="en">{f.langEn}</option>
        </Select>
      </Field>
      <Field label={f.budget}>
        <Input name="budget" defaultValue={lead?.budget ?? ""} placeholder={f.budgetPlaceholder} />
      </Field>
      <Field label={f.estimatedValue}>
        <Input name="estimatedValue" inputMode="numeric" defaultValue={lead?.estimatedValue ?? ""} placeholder="0" />
      </Field>
      <Field label={f.currency}>
        <Select name="currency" defaultValue={lead?.currency ?? "AMD"}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={f.message} className="sm:col-span-2">
        <Textarea name="message" defaultValue={lead?.message ?? ""} placeholder={f.messagePlaceholder} />
      </Field>
      <FormActions className="sm:col-span-2">
        <Button type="submit">{submitLabel ?? t.common.save}</Button>
      </FormActions>
    </form>
  );
}
