import Link from "next/link";
import { desc } from "drizzle-orm";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { clientLabel, entityHref } from "@/lib/admin-helpers";
import { getAdminDict, labelFor, type AdminDict } from "@/lib/i18n/admin";
import { cn, formatDate } from "@/lib/utils";
import { FormActions, PageHeader, Panel, SpecStrip, StatCard } from "@/components/admin/shell";
import { Badge, Button, Field, Input, Select } from "@/components/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { createTaskAction, deleteTaskAction, toggleTaskAction } from "@/app/admin/actions/task-actions";
import type { Task } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const PRIORITY_TONE: Record<string, "neutral" | "brand" | "danger"> = { low: "neutral", normal: "brand", high: "danger" };
const PRIORITIES = ["low", "normal", "high"] as const;

export default async function TasksPage() {
  await requireUser();
  const { t } = await getAdminDict();
  const K = t.tasks;
  const db = getDb();
  const rows = db.select().from(schema.tasks).orderBy(desc(schema.tasks.createdAt)).limit(500).all();
  const open = rows.filter((x) => !x.done);
  const done = rows.filter((x) => x.done);

  const projects = db.select({ id: schema.projects.id, code: schema.projects.code, title: schema.projects.title }).from(schema.projects).orderBy(desc(schema.projects.createdAt)).all();
  const leads = db.select({ id: schema.leads.id, name: schema.leads.name }).from(schema.leads).orderBy(desc(schema.leads.createdAt)).limit(100).all();
  const clients = db.select({ id: schema.clients.id, firstName: schema.clients.firstName, lastName: schema.clients.lastName }).from(schema.clients).all();
  const companies = db.select({ id: schema.companies.id, name: schema.companies.name }).from(schema.companies).all();

  const labels: Record<string, string> = {};
  for (const p of projects) labels[`project:${p.id}`] = `${p.code} ${p.title}`;
  for (const l of leads) labels[`lead:${l.id}`] = K.leadPrefix(l.name);
  for (const c of clients) labels[`client:${c.id}`] = clientLabel(c);
  for (const c of companies) labels[`company:${c.id}`] = c.name;

  const overdue = open.filter((x) => x.dueAt && new Date(x.dueAt).getTime() < Date.now()).length;

  const sortByDue = (a: Task, b: Task) => {
    if (!a.dueAt && !b.dueAt) return 0;
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return a.dueAt.localeCompare(b.dueAt);
  };

  function Row({ task, dict }: { task: Task; dict: AdminDict }) {
    const href = entityHref(task.entityType, task.entityId);
    const label = labels[`${task.entityType}:${task.entityId}`];
    const late = !task.done && task.dueAt && new Date(task.dueAt).getTime() < Date.now();
    return (
      <li className="flex flex-wrap items-center gap-3 py-2.5">
        <form action={toggleTaskAction}>
          <input type="hidden" name="id" value={task.id} />
          <button
            type="submit"
            className={cn("flex h-6 w-6 items-center justify-center rounded-sm border transition-colors", task.done ? "border-success bg-success text-bg" : "border-line-strong text-transparent hover:border-accent hover:text-accent")}
            title={task.done ? K.markOpen : K.markDone}
            aria-label={task.done ? K.markOpen : K.markDone}
          >
            {task.done ? <RotateCcw size={13} /> : <Check size={13} />}
          </button>
        </form>
        <div className="min-w-0 flex-1">
          <div className={cn("text-[13.5px] font-semibold", task.done ? "text-faint line-through" : "text-fg")}>{task.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted">
            <Badge tone={PRIORITY_TONE[task.priority] ?? "neutral"}>{labelFor(dict, "taskPriority", task.priority)}</Badge>
            {task.dueAt ? <span className={cn(late && "font-semibold text-danger")}>{K.dueOn(formatDate(task.dueAt))}</span> : <span>{K.noDue}</span>}
            {href && label ? (
              <Link href={href} className="truncate transition-colors hover:text-accent">
                {label}
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
      <PageHeader title={K.title} subtitle={K.subtitle} />

      <SpecStrip cols={3} className="mb-5">
        <StatCard label={K.open} value={open.length} tone={open.length ? "brand" : undefined} />
        <StatCard label={K.overdue} value={overdue} tone={overdue ? "danger" : undefined} />
        <StatCard label={K.done} value={done.length} />
      </SpecStrip>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
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
          <Panel title={K.doneList(done.length)}>
            {done.length === 0 ? (
              <div className="text-sm text-muted">{K.emptyDone}</div>
            ) : (
              <ul className="divide-y divide-line">
                {done.map((x) => (
                  <Row key={x.id} task={x} dict={t} />
                ))}
              </ul>
            )}
          </Panel>
        </div>

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
    </>
  );
}
