"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/** Submit button that shows a pending state while a server action runs. */
export function SubmitButton({ children, pendingText, className, variant = "primary", disabled, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string; variant?: "primary" | "secondary" | "ghost" | "brand" | "danger" }) {
  const { pending } = useFormStatus();
  const cls = variant === "danger" ? "btn-danger" : `btn-${variant}`;
  // `disabled` is pulled out of the spread on purpose: with `{...rest}` after it, a caller passing
  // disabled={false} used to re-enable the button while the action was still running.
  return (
    <button type="submit" {...rest} disabled={pending || disabled} className={cn(cls, className)}>
      {pending ? (pendingText ?? "…") : children}
    </button>
  );
}

/** Submit button that asks for confirmation first (for delete / cancel operations). */
export function ConfirmSubmit({ message, children, className, disabled, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      {...rest}
      disabled={pending || disabled}
      className={cn("btn-ghost btn-sm text-danger hover:bg-danger-soft", className)}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}
