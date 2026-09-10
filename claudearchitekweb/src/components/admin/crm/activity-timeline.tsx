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

const CHIP = "rounded-sm px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] uppercase";

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
      <ol className="relative ml-1 space-y-4 border-l border-line pl-5">
        {items.map((a) => (
          <li key={a.id} className="relative">
            <span aria-hidden className="absolute top-2 -left-[21px] h-px w-3 bg-line-strong" />
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${CHIP} ${TYPE_TONE[a.type] ?? TYPE_TONE.note}`}>{labelFor(t, "activityType", a.type)}</span>
              <span className="num text-[11px] text-muted" title={formatDate(a.createdAt, true)}>
                {relTime(a.createdAt, locale)}
              </span>
              {a.userId && users[a.userId] ? <span className="font-mono text-[11px] text-faint">· {users[a.userId]}</span> : null}
            </div>
            <div className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-fg-2">{a.content}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
