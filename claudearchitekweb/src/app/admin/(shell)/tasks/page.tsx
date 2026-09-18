import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { AlertTriangle, Check, Plus, RotateCcw, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { clientLabel, entityHref, entityLabels, fmtAdminDay, isTaskOverdue, taskDueDay } from "@/lib/admin-helpers";
import { getAdminDict, labelFor, local, type AdminDict } from "@/lib/i18n/admin";
import { cn } from "@/lib/utils";
import { FormActions, PageHeader, Panel, SpecStrip, StatCard } from "@/components/admin/shell";
import { Badge, Button, Field, Input, Select } from "@/components/ui";
import { Notice, noticeFrom } from "@/components/admin/notice";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { createTaskAction, deleteTaskAction, toggleTaskAction } from "@/app/admin/actions/task-actions";
import type { Task } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/** Priority is not a warning by itself: only "high" is tinted, so the overdue red keeps its meaning. */
const PRIORITY_TONE: Record<string, "neutral" | "warning" | "danger"> = { low: "neutral", normal: "neutral", high: "warning" };
const PRIORITIES = ["low", "normal", "high"] as const;
const DONE_LIMIT = 200;

type SP = Record<string, string | string[] | undefined>;

export default async function TasksPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const K = t.tasks;
  const X = local({ hy: { overdueLabel: "Ժամկետանց" }, en: { overdueLabel: "Overdue" } }, locale);
  const sp = await searchParams;
  const db = getDb();
  // Every open task is loaded (they are what the page is for); only the done archive is capped.
  const open = db.select().from(schema.tasks).where(eq(schema.tasks.done, false)).orderBy(desc(schema.tasks.createdAt)).all();
  const done = db.select().from(schema.tasks).where(eq(schema.tasks.done, true)).orderBy(desc(schema.tasks.createdAt)).limit(DONE_LIMIT).all();
  const doneTotal = db.select({ c: sql<number>`count(*)` }).from(schema.tasks).where(eq(schema.tasks.done, true)).get()?.c ?? 0;

  const projects = db.select({ id: schema.projects.id, code: schema.projects.code, title: schema.projects.title }).from(schema.projects).orderBy(desc(schema.projects.createdAt)).all();
  // The picker lists every lead: a task could not be attached to a lead older than the newest 100.
  const leads = db.select({ id: schema.leads.id, name: schema.leads.name }).from(schema.leads).orderBy(desc(schema.leads.createdAt)).all();
  const clients = db.select({ id: schema.clients.id, firstName: schema.clients.firstName, lastName: schema.clients.lastName }).from(schema.clients).all();
  const companies = db.select({ id: schema.companies.id, name: schema.companies.name }).from(schema.companies).all();

  // Labels come from the ids the loaded tasks really reference, so a link never disappears
  // because its record is older than some "newest N" list.
  const labels = entityLabels([...open, ...done], K.leadPrefix);

  const overdue = open.filter((x) => isTaskOverdue(x)).length;

  const sortByDue = (a: Task, b: Task) => {
    if (!a.dueAt && !b.dueAt) return 0;
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return a.dueAt.localeCompare(b.dueAt);
  };

  function Row({ task, dict }: { task: Task; dict: AdminDict }) {
    const href = entityHref(task.entityType, task.entityId);
    const label = labels[`${task.entityType}:${task.entityId}`];
    const day = taskDueDay(task.dueAt);
    const late = isTaskOverdue(task);
    return (
      <li className="flex flex-wrap items-center gap-2 py-2.5 sm:gap-3">
        <form action={toggleTaskAction}>
          <input type="hidden" name="id" value={task.id} />
          {/* 40px tap target around a 24px box: -m-2 keeps the row height unchanged */}
          <button type="submit" className="-m-2 flex h-10 w-10 items-center justify-center p-2 text-fg" title={task.done ? K.markOpen : K.markDone} aria-label={task.done ? K.markOpen : K.markDone}>
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-sm border transition-colors", task.done ? "border-success bg-success text-bg" : "border-line-strong text-transparent hover:border-accent hover:text-accent")}>{task.done ? <RotateCcw size={13} /> : <Check size={13} />}</span>
          </button>
        </form>
        <div className="min-w-0 flex-1">
          <div className={cn("text-[13.5px] font-semibold [overflow-wrap:anywhere]", task.done ? "text-faint line-through" : "text-fg")}>{task.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted">
            <Badge tone={PRIORITY_TONE[task.priority] ?? "neutral"}>{labelFor(dict, "taskPriority", task.priority)}</Badge>
            {day ? (
              // Overdue is not conveyed by colour alone: an overdue task says so in words.
              <span className={cn("inline-flex items-center gap-1", late && "font-semibold text-danger")}>
                {late ? (
                  <>
                    <AlertTriangle size={12} aria-hidden />
                    <span className="sr-only">{X.overdueLabel}: </span>
                  </>
                ) : null}
                {K.dueOn(fmtAdminDay(day, locale))}
              </span>
            ) : (
              <span>{K.noDue}</span>
            )}
            {href && label ? (
              <Link href={href} className="inline-flex min-h-10 min-w-0 items-center transition-colors hover:text-accent sm:min-h-0">
                <span className="truncate">{label}</span>
              </Link>
            ) : null}
          </div>
        </div>
        <form action={deleteTaskAction}>
          <input type="hidden" name="id" value={task.id} />
          <ConfirmButton message={K.deleteConfirm} className="btn-ghost btn-sm text-danger" title={t.common.delete} aria-label={t.common.delete}>
            <Trash2 size={14} />
          </ConfirmButton>
        </form>
      </li>
    );
  }

  return (
    <>
      <Notice {...noticeFrom(sp)} />
      <PageHeader
        title={K.title}
        subtitle={K.subtitle}
        actions={
          // On a phone the form is below both lists; this jumps straight to it.
          <a href="#new-task" className="btn-primary btn-sm lg:hidden">
            <Plus size={14} /> {K.new}
          </a>
        }
      />

      <SpecStrip cols={3} className="mb-5">
        <StatCard label={K.open} value={open.length} tone={open.length ? "brand" : undefined} />
        <StatCard label={K.overdue} value={overdue} tone={overdue ? "danger" : undefined} />
        <StatCard label={K.done} value={doneTotal} />
      </SpecStrip>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Panel title={K.openList(open.length)}>
            {open.length === 0 ? (
              <div className="text-sm text-muted">{K.emptyOpen}</div>
            ) : (
              <ul className="divide-y divide-line">
                {[...open].sort(sortByDue).map((x) => (
                  <Row key={x.id} task={x} dict={t} />
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={K.doneList(doneTotal)}>
            {done.length === 0 ? (
              <div className="text-sm text-muted">{K.emptyDone}</div>
            ) : (
              <>
                <ul className="divide-y divide-line">
                  {done.map((x) => (
                    <Row key={x.id} task={x} dict={t} />
                  ))}
                </ul>
                {doneTotal > done.length ? <p className="caption mt-3">{t.common.showingOf(done.length, doneTotal)}</p> : null}
              </>
            )}
          </Panel>
        </div>

        <div id="new-task" className="min-w-0 scroll-mt-20">
          <Panel title={K.new}>
            <form action={createTaskAction} className="space-y-3">
              <Field label={K.titleLabel} required>
                <Input name="title" required maxLength={200} placeholder={K.titlePlaceholder} />
              </Field>
              <Field label={K.due}>
                <Input type="date" name="dueAt" />
              </Field>
              <Field label={K.priority}>
                <Select name="priority" defaultValue="normal">
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {labelFor(t, "taskPriority", p)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={K.linkedTo}>
                <Select name="entity" defaultValue="">
                  <option value="">{t.crm.form.none}</option>
                  <optgroup label={K.groups.projects}>
                    {projects.map((p) => (
                      <option key={p.id} value={`project:${p.id}`}>
                        {p.code} {p.title}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={K.groups.leads}>
                    {leads.map((l) => (
                      <option key={l.id} value={`lead:${l.id}`}>
                        {l.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={K.groups.clients}>
                    {clients.map((c) => (
                      <option key={c.id} value={`client:${c.id}`}>
                        {clientLabel(c)}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={K.groups.companies}>
                    {companies.map((c) => (
                      <option key={c.id} value={`company:${c.id}`}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                </Select>
              </Field>
              <FormActions>
                <Button type="submit" className="w-full">
                  {K.add}
                </Button>
              </FormActions>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
