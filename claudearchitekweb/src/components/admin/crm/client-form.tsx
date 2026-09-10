import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { LEAD_SOURCES } from "@/lib/crm";
import { parseJson } from "@/lib/utils";
import type { Client } from "@/lib/db/schema";

const STATUSES = ["lead", "active", "vip", "inactive"];

/** Create / edit form for a client (individual or company contact). Server component — pass the server action. */
export function ClientForm({
  client,
  action,
  companies,
  defaultCompanyId,
  lockCompany,
  returnTo,
  submitLabel = "Save",
  compact,
}: {
  client?: Client | null;
  action: (fd: FormData) => Promise<void>;
  companies: { id: string; name: string }[];
  defaultCompanyId?: string | null;
  lockCompany?: boolean;
  returnTo?: string;
  submitLabel?: string;
  compact?: boolean;
}) {
  const tags = parseJson<string[]>(client?.tags, []).join(", ");
  const companyId = client?.companyId ?? defaultCompanyId ?? "";
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {client ? <input type="hidden" name="id" value={client.id} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <input type="hidden" name="kind" value="contact" />
      {lockCompany ? <input type="hidden" name="companyId" value={companyId} /> : null}
      <Field label="First name" required>
        <Input name="firstName" required defaultValue={client?.firstName ?? ""} placeholder="Aren" />
      </Field>
      <Field label="Last name">
        <Input name="lastName" defaultValue={client?.lastName ?? ""} />
      </Field>
      {!lockCompany ? (
        <Field label="Company" hint="Leave empty for an individual client">
          <Select name="companyId" defaultValue={companyId}>
            <option value="">— individual —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label="Position">
        <Input name="position" defaultValue={client?.position ?? ""} placeholder="Head of production" />
      </Field>
      <Field label="Phone">
        <Input name="phone" defaultValue={client?.phone ?? ""} placeholder="+374 …" />
      </Field>
      <Field label="Telegram">
        <Input name="telegram" defaultValue={client?.telegram ?? ""} placeholder="@username" />
      </Field>
      <Field label="WhatsApp">
        <Input name="whatsapp" defaultValue={client?.whatsapp ?? ""} placeholder="+374 …" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={client?.email ?? ""} />
      </Field>
      <Field label="Language">
        <Select name="language" defaultValue={client?.language ?? "hy"}>
          <option value="hy">Armenian</option>
          <option value="ru">Russian</option>
          <option value="en">English</option>
        </Select>
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue={client?.status ?? "active"}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="City">
        <Input name="city" defaultValue={client?.city ?? ""} placeholder="Yerevan" />
      </Field>
      <Field label="Source">
        <Select name="source" defaultValue={client?.source ?? ""}>
          <option value="">—</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      {compact ? null : (
        <>
          <Field label="Address" className="sm:col-span-2">
            <Input name="address" defaultValue={client?.address ?? ""} />
          </Field>
          <Field label="Tags" hint="Comma separated" className="sm:col-span-2">
            <Input name="tags" defaultValue={tags} placeholder="vip, repeat, referral" />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea name="notes" defaultValue={client?.notes ?? ""} placeholder="Preferences, family, delivery notes…" />
          </Field>
        </>
      )}
      <div className="sm:col-span-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
