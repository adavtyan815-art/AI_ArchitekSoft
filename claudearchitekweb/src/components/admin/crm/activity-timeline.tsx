import { addActivityAction } from "@/app/admin/actions/crm-actions";
import { Button, Input, Select } from "@/components/ui";
import { relTime } from "@/lib/admin-helpers";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { formatDate } from "@/lib/utils";
import type { Activity } from "@/lib/db/schema";

const TYPE_TONE: Record<string, string> = {
  note: "bg-surface-2 text-fg-2",
  call: "bg-accent-soft text-accent-soft-fg",
  meeting: "bg-warning-soft text-warning",
  email: "bg-surface-2 text-fg-2",
  message: "bg-accent-soft text-accent-soft-fg",
  status: "bg-success-soft text-success",
  system: "bg-surface-2 text-muted",
};

/** Activities list + "add note" form for any CRM entity. Server component. */
export async function ActivityTimeline({
  entityType,
  entityId,
  items,
  types = ["note", "call", "meeting", "email", "message"],
  users = {},
}: {
  entityType: string;
  entityId: string;
  items: Activity[];
  types?: string[];
  users?: Record<string, string>;
}) {
  const { t, locale } = await getAdminDict();
  const L = t.crm.activity;
  return (
    <div>
      <form action={addActivityAction} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="entityType" value={entityType} />
        <input type="hidden" name="entityId" value={entityId} />
        <Select name="type" defaultValue="note" className="sm:w-40">
          {types.map((ty) => (
            <option key={ty} value={ty}>
              {labelFor(t, "activityType", ty)}
            </option>
          ))}
        </Select>
        <Input name="content" placeholder={L.placeholder} required maxLength={4000} className="flex-1" />
        <Button type="submit" size="sm" className="sm:self-stretch">
          {L.add}
        </Button>
      </form>
      {items.length === 0 ? <div className="text-sm text-muted">{L.empty}</div> : null}
      <ol className="relative space-y-3 border-l border-line pl-4">
        {items.map((a) => (
          <li key={a.id} className="relative">
            <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-surface bg-line-strong" />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className={`rounded-md px-1.5 py-0.5 font-medium ${TYPE_TONE[a.type] ?? TYPE_TONE.note}`}>{labelFor(t, "activityType", a.type)}</span>
              <span title={formatDate(a.createdAt, true)}>{relTime(a.createdAt, locale)}</span>
              {a.userId && users[a.userId] ? <span>· {users[a.userId]}</span> : null}
            </div>
            <div className="mt-0.5 whitespace-pre-wrap text-sm text-fg-2">{a.content}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
