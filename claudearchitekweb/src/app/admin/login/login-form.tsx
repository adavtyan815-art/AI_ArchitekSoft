"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions/auth-actions";
import { Button, Field, Input } from "@/components/ui";

export function LoginForm({ next, labels }: { next: string; labels: { email: string; password: string; submit: string; pending: string } }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label={labels.email} required>
        <Input name="email" type="email" autoComplete="username" required placeholder="admin@architeksoft.com" />
      </Field>
      <Field label={labels.password} required>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state?.error ? <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</div> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? labels.pending : labels.submit}
      </Button>
    </form>
  );
}
