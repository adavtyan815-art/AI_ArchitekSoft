import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { LEAD_SOURCES } from "@/lib/crm";
import type { Lead } from "@/lib/db/schema";

const SERVICES = ["kitchenpro", "showroom", "ar", "cnc", "real_estate", "custom", "other"];
const ROOMS = ["kitchen", "wardrobe", "living", "bathroom", "office", "apartment", "other"];

/** Create / edit form for a lead. Server component — pass the server action. */
export function LeadForm({ lead, action, submitLabel = "Save" }: { lead?: Lead | null; action: (fd: FormData) => Promise<void>; submitLabel?: string }) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {lead ? <input type="hidden" name="id" value={lead.id} /> : null}
      <Field label="Segment" required>
        <Select name="segment" defaultValue={lead?.segment ?? "b2c"}>
          <option value="b2c">B2C — individual</option>
          <option value="b2b">B2B — company</option>
        </Select>
      </Field>
      {!lead ? (
        <Field label="Source" required>
          <Select name="source" defaultValue="phone">
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label="Assigned to">
          <Input name="assignedTo" defaultValue={lead.assignedTo ?? ""} placeholder="Manager name" />
        </Field>
      )}
      <Field label="Name" required>
        <Input name="name" required defaultValue={lead?.name ?? ""} placeholder="Client or contact name" />
      </Field>
      <Field label="Company (B2B)">
        <Input name="companyName" defaultValue={lead?.companyName ?? ""} />
      </Field>
      <Field label="Phone">
        <Input name="phone" defaultValue={lead?.phone ?? ""} placeholder="+374 …" />
      </Field>
      <Field label="Telegram">
        <Input name="telegram" defaultValue={lead?.telegram ?? ""} placeholder="@username" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={lead?.email ?? ""} />
      </Field>
      <Field label="Preferred channel">
        <Select name="preferredChannel" defaultValue={lead?.preferredChannel ?? ""}>
          <option value="">—</option>
          <option value="phone">Phone</option>
          <option value="telegram">Telegram</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
        </Select>
      </Field>
      <Field label="Service">
        <Select name="service" defaultValue={lead?.service ?? ""}>
          <option value="">—</option>
          {SERVICES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Room">
        <Select name="roomType" defaultValue={lead?.roomType ?? ""}>
          <option value="">—</option>
          {ROOMS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Language">
        <Select name="language" defaultValue={lead?.language ?? "hy"}>
          <option value="hy">Armenian</option>
          <option value="ru">Russian</option>
          <option value="en">English</option>
        </Select>
      </Field>
      <Field label="Budget (as told)">
        <Input name="budget" defaultValue={lead?.budget ?? ""} placeholder="e.g. 1.5–2M AMD" />
      </Field>
      <Field label="Estimated value">
        <Input name="estimatedValue" inputMode="numeric" defaultValue={lead?.estimatedValue ?? ""} placeholder="0" />
      </Field>
      <Field label="Currency">
        <Select name="currency" defaultValue={lead?.currency ?? "AMD"}>
          <option value="AMD">AMD</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="RUB">RUB</option>
        </Select>
      </Field>
      <Field label="Message / request" className="sm:col-span-2">
        <Textarea name="message" defaultValue={lead?.message ?? ""} placeholder="What the client asked for, dimensions, style, deadline…" />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
