import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { clientLabel, entityHref } from "@/lib/admin-helpers";
import { cn, formatDate } from "@/lib/utils";
import { PageHeader, Panel, StatCard } from "@/components/admin/shell";
import { Badge, Button, Field, Input, Select } from "@/components/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { createTaskAction, deleteTaskAction, toggleTaskAction } from "@/app/admin/actions/task-actions";
import type { Task } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const PRIORITY_TONE: Record<string, "neutral" | "brand" | "danger"> = { low: "neutral", normal: "brand", high: "danger" };

export default async function TasksPage() {
  await requireUser();
  const db = getDb();
  const rows = db.select().from(schema.tasks).orderBy(desc(schema.tasks.createdAt)).limit(500).all();
  const open = rows.filter((t) => !t.done);
  const done = rows.filter((t) => t.done);

  const projects = db.select({ id: schema.projects.id, code: schema.projects.code, title: schema.projects.title }).from(schema.projects).orderBy(desc(schema.projects.createdAt)).all();
  const leads = db.select({ id: schema.leads.id, name: schema.leads.name }).from(schema.leads).orderBy(desc(schema.leads.createdAt)).limit(100).all();
  const clients = db.select({ id: schema.clients.id, firstName: schema.clients.firstName, lastName: schema.clients.lastName }).from(schema.clients).all();
  const companies = db.select({ id: schema.companies.id, name: schema.companies.name }).from(schema.companies).all();

  const labels: Record<string, string> = {};
  for (const p of projects) labels[`project:${p.id}`] = `${p.code} ${p.title}`;
  for (const l of leads) labels[`lead:${l.id}`] = `Lead: ${l.name}`;
  for (const c of clients) labels[`client:${c.id}`] = clientLabel(c);
  for (const c of companies) labels[`company:${c.id}`] = c.name;

  const overdue = open.filter((t) => t.dueAt && new Date(t.dueAt).getTime() < Date.now()).length;

  const sortByDue = (a: Task, b: Task) => {
    if (!a.dueAt && !b.dueAt) return 0;
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return a.dueAt.localeCompare(b.dueAt);
  };

  function Row({ t }: { t: Task }) {
    const href = entityHref(t.entityType, t.entityId);
    const label = labels[`${t.entityType}:${t.entityId}`];
    const late = !t.done && t.dueAt && new Date(t.dueAt).getTime() < Date.now();
    return (
      <li className="flex flex-wrap items-center gap-3 py-2.5">
        <form action={toggleTaskAction}>
          <input type="hidden" name="id" value={t.id} />
          <button type="submit" className={cn("flex h-6 w-6 items-center justify-center rounded-md border", t.done ? "border-success-500 bg-success-500 text-white" : "border-ink-300 text-transparent hover:border-ink-500")} title={t.done ? "Mark as open" : "Mark as done"}>
            {t.done ? <RotateCcw size={13} /> : <Check size={13} />}
          </button>
        </form>
        <div className="min-w-0 flex-1">
          <div className={cn("text-sm font-medium", t.done ? "text-ink-400 line-through" : "text-ink-900")}>{t.title}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <Badge tone={PRIORITY_TONE[t.priority] ?? "neutral"}>{t.priority}</Badge>
            {t.dueAt ? <span className={cn(late && "font-semibold text-danger-500")}>due {formatDate(t.dueAt)}</span> : <span>no due date</span>}
            {href && label ? (
              <Link href={href} className="truncate hover:text-brand-600">
                {label}
              </Link>
            ) : null}
          </div>
        </div>
        <form action={deleteTaskAction}>
          <input type="hidden" name="id" value={t.id} />
          <ConfirmButton message="Delete this task?" className="btn-ghost btn-sm text-danger-500" title="Delete">
            <Trash2 size={14} />
          </ConfirmButton>
        </form>
      </li>
    );
  }

  return (
    <>
      <PageHeader title="Tasks" subtitle="Small follow-ups that keep deals and projects moving." />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Open" value={open.length} tone={open.length ? "brand" : undefined} />
        <StatCard label="Overdue" value={overdue} tone={overdue ? "danger" : undefined} />
        <StatCard label="Done" value={done.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title={`Open (${open.length})`}>
            {open.length === 0 ? <div className="text-sm text-ink-500">Nothing pending. Add a task on the right.</div> : <ul className="divide-y divide-line">{[...open].sort(sortByDue).map((t) => <Row key={t.id} t={t} />)}</ul>}
          </Panel>
          <Panel title={`Done (${done.length})`}>
            {done.length === 0 ? <div className="text-sm text-ink-500">No completed tasks yet.</div> : <ul className="divide-y divide-line">{done.map((t) => <Row key={t.id} t={t} />)}</ul>}
          </Panel>
        </div>

        <Panel title="New task">
          <form action={createTaskAction} className="space-y-3">
            <Field label="Title" required>
              <Input name="title" required maxLength={200} placeholder="Call Aren about the worktop" />
            </Field>
            <Field label="Due date">
              <Input type="date" name="dueAt" />
            </Field>
            <Field label="Priority">
              <Select name="priority" defaultValue="normal">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
            </Field>
            <Field label="Linked to">
              <Select name="entity" defaultValue="">
                <option value="">—</option>
                <optgroup label="Projects">
                  {projects.map((p) => (
                    <option key={p.id} value={`project:${p.id}`}>
                      {p.code} {p.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Leads">
                  {leads.map((l) => (
                    <option key={l.id} value={`lead:${l.id}`}>
                      {l.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Clients">
                  {clients.map((c) => (
                    <option key={c.id} value={`client:${c.id}`}>
                      {clientLabel(c)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Companies">
                  {companies.map((c) => (
                    <option key={c.id} value={`company:${c.id}`}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </Field>
            <Button type="submit" className="w-full">
              Add task
            </Button>
          </form>
        </Panel>
      </div>
    </>
  );
}
