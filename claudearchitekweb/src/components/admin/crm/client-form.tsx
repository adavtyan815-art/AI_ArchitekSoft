import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { FormActions } from "@/components/admin/shell";
import { LEAD_SOURCES } from "@/lib/crm";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { parseJson } from "@/lib/utils";
import type { Client } from "@/lib/db/schema";

const STATUSES = ["lead", "active", "vip", "inactive"];

/** Create / edit form for a client (individual or company contact). Server component — pass the server action. */
export async function ClientForm({
  client,
  action,
  companies,
  defaultCompanyId,
  lockCompany,
  returnTo,
  submitLabel,
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
  const { t } = await getAdminDict();
  const f = t.crm.form;
  const tags = parseJson<string[]>(client?.tags, []).join(", ");
  const companyId = client?.companyId ?? defaultCompanyId ?? "";
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {client ? <input type="hidden" name="id" value={client.id} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <input type="hidden" name="kind" value="contact" />
      {lockCompany ? <input type="hidden" name="companyId" value={companyId} /> : null}
      <Field label={f.firstName} required>
        <Input name="firstName" required defaultValue={client?.firstName ?? ""} placeholder="Արեն" />
      </Field>
      <Field label={f.lastName}>
        <Input name="lastName" defaultValue={client?.lastName ?? ""} />
      </Field>
      {!lockCompany ? (
        <Field label={f.company} hint={f.companyHint}>
          <Select name="companyId" defaultValue={companyId}>
            <option value="">{f.individualOption}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label={f.position}>
        <Input name="position" defaultValue={client?.position ?? ""} placeholder={f.positionPlaceholder} />
      </Field>
      <Field label={f.phone}>
        <Input name="phone" defaultValue={client?.phone ?? ""} placeholder="+374 …" />
      </Field>
      <Field label={f.telegram}>
        <Input name="telegram" defaultValue={client?.telegram ?? ""} placeholder="@username" />
      </Field>
      <Field label={f.whatsapp}>
        <Input name="whatsapp" defaultValue={client?.whatsapp ?? ""} placeholder="+374 …" />
      </Field>
      <Field label={f.email}>
        <Input name="email" type="email" defaultValue={client?.email ?? ""} />
      </Field>
      <Field label={f.language}>
        <Select name="language" defaultValue={client?.language ?? "hy"}>
          <option value="hy">{f.langHy}</option>
          <option value="ru">{f.langRu}</option>
          <option value="en">{f.langEn}</option>
        </Select>
      </Field>
      <Field label={f.status}>
        <Select name="status" defaultValue={client?.status ?? "active"}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {labelFor(t, "clientStatus", s)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={f.city}>
        <Input name="city" defaultValue={client?.city ?? ""} placeholder={f.cityPlaceholder} />
      </Field>
      <Field label={f.source}>
        <Select name="source" defaultValue={client?.source ?? ""}>
          <option value="">{f.none}</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {labelFor(t, "leadSources", s)}
            </option>
          ))}
        </Select>
      </Field>
      {compact ? null : (
        <>
          <Field label={f.address} className="sm:col-span-2">
            <Input name="address" defaultValue={client?.address ?? ""} />
          </Field>
          <Field label={f.tags} hint={f.tagsHint} className="sm:col-span-2">
            <Input name="tags" defaultValue={tags} placeholder={f.tagsPlaceholder} />
          </Field>
          <Field label={f.notes} className="sm:col-span-2">
            <Textarea name="notes" defaultValue={client?.notes ?? ""} placeholder={f.notesPlaceholder} />
          </Field>
        </>
      )}
      <FormActions className="sm:col-span-2">
        <Button type="submit">{submitLabel ?? t.common.save}</Button>
      </FormActions>
    </form>
  );
}
