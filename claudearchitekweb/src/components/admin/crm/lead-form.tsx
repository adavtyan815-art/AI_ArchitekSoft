import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { FormActions } from "@/components/admin/shell";
import { LEAD_SOURCES } from "@/lib/crm";
import { LEAD_ROOMS, LEAD_SERVICES } from "@/lib/form";
import { getDb, schema } from "@/lib/db";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import type { Lead } from "@/lib/db/schema";

const CURRENCIES = ["AMD", "USD", "EUR", "RUB"];

/** The stored value first, so a value the list does not know (an older key) is still selectable and never nulled on save. */
function withStored(list: readonly string[], stored: string | null | undefined): string[] {
  return stored && !list.includes(stored) ? [stored, ...list] : [...list];
}

/**
 * The people a lead can be assigned to: the admin users, by name (leads.assigned_to stores the name,
 * which is what the lead list and the detail page show). Sliced to the 80 characters the action accepts,
 * so what the picker offers is exactly what a save stores.
 */
function assigneeNames(): string[] {
  return getDb()
    .select({ name: schema.users.name })
    .from(schema.users)
    .orderBy(schema.users.name)
    .all()
    .map((u) => u.name.trim().slice(0, 80))
    .filter(Boolean);
}

/** Create / edit form for a lead. Server component — pass the server action. */
export async function LeadForm({ lead, action, submitLabel }: { lead?: Lead | null; action: (fd: FormData) => Promise<void>; submitLabel?: string }) {
  const { t } = await getAdminDict();
  const f = t.crm.form;
  const services = withStored(LEAD_SERVICES, lead?.service);
  const rooms = withStored(LEAD_ROOMS, lead?.roomType);
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
        <Field label={f.assignedTo} hint={f.assignedToHint}>
          {/* A picker, not free text: a mistyped name used to make a lead look assigned to nobody in the team. A name
              stored before (or by an admin user who has since been removed) stays in the list, so a save never drops it. */}
          <Select name="assignedTo" defaultValue={lead.assignedTo ?? ""}>
            <option value="">{f.assignedToNobody}</option>
            {withStored(assigneeNames(), lead.assignedTo).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label={f.name} required>
        <Input name="name" required maxLength={120} defaultValue={lead?.name ?? ""} placeholder={f.namePlaceholder} />
      </Field>
      <Field label={f.companyName}>
        <Input name="companyName" maxLength={120} defaultValue={lead?.companyName ?? ""} />
      </Field>
      <Field label={f.phone}>
        <Input name="phone" type="tel" inputMode="tel" maxLength={40} defaultValue={lead?.phone ?? ""} placeholder="+374 …" />
      </Field>
      <Field label={f.telegram}>
        <Input name="telegram" maxLength={60} defaultValue={lead?.telegram ?? ""} placeholder="@username" />
      </Field>
      <Field label={f.email}>
        <Input name="email" type="email" maxLength={120} defaultValue={lead?.email ?? ""} />
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
          {services.map((s) => (
            <option key={s} value={s}>
              {labelFor(t, "services", s)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={f.room}>
        <Select name="roomType" defaultValue={lead?.roomType ?? ""}>
          <option value="">{f.none}</option>
          {rooms.map((s) => (
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
        <Input name="budget" maxLength={80} defaultValue={lead?.budget ?? ""} placeholder={f.budgetPlaceholder} />
      </Field>
      <Field label={f.estimatedValue}>
        <Input name="estimatedValue" inputMode="decimal" maxLength={20} defaultValue={lead?.estimatedValue ?? ""} placeholder="0" />
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
        <Textarea name="message" maxLength={4000} defaultValue={lead?.message ?? ""} placeholder={f.messagePlaceholder} />
      </Field>
      <FormActions className="sm:col-span-2">
        <Button type="submit">{submitLabel ?? t.common.save}</Button>
      </FormActions>
    </form>
  );
}
