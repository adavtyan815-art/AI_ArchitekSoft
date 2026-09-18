"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions/auth-actions";
import { Button, Field, Input } from "@/components/ui";

export type LoginLabels = {
  email: string;
  password: string;
  submit: string;
  pending: string;
  /** Shown for a wrong email/password pair. */
  invalid: string;
  /** Shown after too many attempts; `{min}` is replaced with the wait in minutes. */
  locked: string;
};

export function LoginForm({ next, labels }: { next: string; labels: LoginLabels }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, undefined);
  // The action returns a key, so the message is always in the language of the page.
  const error = !state?.error ? null : state.error === "locked" ? labels.locked.replace("{min}", String(Math.max(1, Math.ceil((state.retryAfterSec ?? 60) / 60)))) : labels.invalid;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label={labels.email} required>
        {/* keyed by the last answer so a new server response re-seeds the (uncontrolled) field */}
        <Input key={state?.email ?? ""} name="email" type="email" autoComplete="username" required defaultValue={state?.email ?? ""} placeholder="name@example.com" />
      </Field>
      <Field label={labels.password} required>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      {error ? <div role="alert" className="rounded-sm border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</div> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? labels.pending : labels.submit}
      </Button>
    </form>
  );
}
