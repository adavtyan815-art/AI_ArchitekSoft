"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/admin/form-buttons";
import { changePasswordAction } from "@/app/admin/actions/settings-actions";

export type PasswordLabels = {
  current: string;
  currentHint: string;
  newPassword: string;
  passwordHint: string;
  repeat: string;
  mismatch: string;
  save: string;
  saving: string;
  signsOutOthers: string;
};

/**
 * Change password: current password, new, repeat.
 *
 * The repeat field carries the mismatch as a native validity message, so the browser stops the submit
 * instead of the server answering with a redirect that empties both boxes. The current password is
 * required by `changePasswordAction`, so a stolen session cannot take the account over on its own.
 */
export function PasswordForm({ labels }: { labels: PasswordLabels }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const confirmRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const mismatch = confirm.length > 0 && password !== confirm;

  useEffect(() => {
    confirmRef.current?.setCustomValidity(mismatch ? labels.mismatch : "");
  }, [mismatch, labels.mismatch]);

  return (
    <form action={changePasswordAction} className="grid max-w-md gap-4">
      <Field label={labels.current} required hint={labels.currentHint}>
        <Input name="currentPassword" type="password" required autoComplete="current-password" maxLength={200} />
      </Field>
      <Field label={labels.newPassword} required hint={labels.passwordHint}>
        <Input name="password" type="password" minLength={8} maxLength={200} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label={labels.repeat} required>
        {/* A plain input, because this one needs a ref for setCustomValidity. */}
        <input
          ref={confirmRef}
          className="input"
          name="confirm"
          type="password"
          minLength={8}
          maxLength={200}
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch || undefined}
          aria-describedby={mismatch ? errorId : undefined}
        />
      </Field>
      {mismatch ? (
        <p id={errorId} role="alert" className="text-[13px] text-danger">
          {labels.mismatch}
        </p>
      ) : null}
      <p className="text-xs text-muted">{labels.signsOutOthers}</p>
      <div className="sticky bottom-[72px] z-10 -mx-4 mt-1 flex flex-wrap items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none">
        <SubmitButton pendingText={labels.saving} className="w-full whitespace-normal sm:w-auto sm:whitespace-nowrap">
          {labels.save}
        </SubmitButton>
      </div>
    </form>
  );
}
