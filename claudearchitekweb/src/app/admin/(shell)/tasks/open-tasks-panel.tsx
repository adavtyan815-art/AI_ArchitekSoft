/**
 * Open tasks attached to one CRM record (lead, client, company).
 *
 * `schema.tasks` is polymorphic and was read only by /admin/tasks, so a task created against a
 * client or a company was invisible on that record's own page. Lead, client and company detail
 * pages all render this panel, so the query and the markup live in one place.
 *
 * Server component: it renders inside the detail pages, which are `force-dynamic`.
 */
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { fmtAdminDay, isTaskOverdue, taskDueDay } from "@/lib/admin-helpers";
import { Panel } from "@/components/admin/shell";
import { cn } from "@/lib/utils";
import type { AdminDict, AdminLocale } from "@/lib/i18n/admin";
import type { Task } from "@/lib/db/schema";

export type TaskEntityType = "lead" | "client" | "company" | "project";

/** Open tasks for one record, earliest due date first, undated last. */
export function openTasksFor(entityType: TaskEntityType, entityId: string): Task[] {
  return getDb()
    .select()
    .from(schema.tasks)
    .where(and(eq(schema.tasks.entityType, entityType), eq(schema.tasks.entityId, entityId), eq(schema.tasks.done, false)))
    .all()
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
}

export function OpenTasksPanel({ tasks, t, locale }: { tasks: Task[]; t: AdminDict; locale: AdminLocale }) {
  return (
    <Panel
      title={t.common.openTasks(tasks.length)}
      actions={
        // -my-2.5 keeps the 40px tap target from growing the panel header on a phone.
        <Link href="/admin/tasks" className="-my-2.5 inline-flex min-h-10 items-center font-mono text-[10.5px] tracking-[0.1em] text-accent uppercase hover:underline">
          {t.common.allTasks}
        </Link>
      }
    >
      {tasks.length === 0 ? (
        <div className="text-sm text-muted">{t.common.noOpenTasks}</div>
      ) : (
        <ul className="divide-y divide-line">
          {tasks.map((task) => {
            const day = taskDueDay(task.dueAt);
            const late = isTaskOverdue(task);
            return (
              <li key={task.id} className="py-2">
                <div className="text-[13.5px] [overflow-wrap:anywhere] text-fg">{task.title}</div>
                <div className="caption mt-0.5">
                  {day ? (
                    <span className={cn(late && "font-semibold text-danger")}>
                      {/* colour alone must not carry "overdue" */}
                      {late ? <span className="sr-only">{t.tasks.overdue}: </span> : null}
                      {t.tasks.dueOn(fmtAdminDay(day, locale))}
                    </span>
                  ) : (
                    t.tasks.noDue
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
