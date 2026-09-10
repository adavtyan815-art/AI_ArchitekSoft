import { addActivityAction } from "@/app/admin/actions/crm-actions";
import { Button, Input, Select } from "@/components/ui";
import { formatDate, relativeTime } from "@/lib/utils";
import type { Activity } from "@/lib/db/schema";

const TYPE_TONE: Record<string, string> = {
  note: "bg-ink-100 text-ink-700",
  call: "bg-brand-50 text-brand-700",
  meeting: "bg-amber-50 text-amber-700",
  email: "bg-ink-100 text-ink-700",
  message: "bg-brand-50 text-brand-700",
  status: "bg-green-50 text-green-700",
  system: "bg-ink-50 text-ink-500",
};

/** Activities list + "add note" form for any CRM entity. Server component. */
export function ActivityTimeline({ entityType, entityId, items, types = ["note", "call", "meeting", "email", "message"], users = {} }: { entityType: string; entityId: string; items: Activity[]; types?: string[]; users?: Record<string, string> }) {
  return (
    <div>
      <form action={addActivityAction} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="entityType" value={entityType} />
        <input type="hidden" name="entityId" value={entityId} />
        <Select name="type" defaultValue="note" className="sm:w-36">
          {types.map((t) => (
            <option key={t} value={t}>
              {t[0].toUpperCase() + t.slice(1)}
            </option>
          ))}
        </Select>
        <Input name="content" placeholder="Add a note, call summary, meeting outcome…" required maxLength={4000} className="flex-1" />
        <Button type="submit" size="sm" className="sm:self-stretch">
          Add
        </Button>
      </form>
      {items.length === 0 ? <div className="text-sm text-ink-500">No activity yet.</div> : null}
      <ol className="relative space-y-3 border-l border-line pl-4">
        {items.map((a) => (
          <li key={a.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-ink-300" />
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
              <span className={`rounded-md px-1.5 py-0.5 font-medium ${TYPE_TONE[a.type] ?? TYPE_TONE.note}`}>{a.type}</span>
              <span title={formatDate(a.createdAt, true)}>{relativeTime(a.createdAt)}</span>
              {a.userId && users[a.userId] ? <span>· {users[a.userId]}</span> : null}
            </div>
            <div className="mt-0.5 whitespace-pre-wrap text-sm text-ink-800">{a.content}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
