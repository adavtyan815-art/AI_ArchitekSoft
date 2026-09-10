"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions/auth-actions";
import { Button, Field, Input } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" required>
        <Input name="email" type="email" autoComplete="username" required defaultValue="" placeholder="admin@architeksoft.com" />
      </Field>
      <Field label="Password" required>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state?.error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
