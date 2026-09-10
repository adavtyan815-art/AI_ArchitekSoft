"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/** Submit button that shows a pending state while a server action runs. */
export function SubmitButton({ children, pendingText, className, variant = "primary", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string; variant?: "primary" | "secondary" | "ghost" | "brand" | "danger" }) {
  const { pending } = useFormStatus();
  const cls = variant === "danger" ? "btn-secondary text-red-700 hover:border-red-300 hover:bg-red-50" : `btn-${variant}`;
  return (
    <button type="submit" disabled={pending || rest.disabled} className={cn(cls, className)} {...rest}>
      {pending ? (pendingText ?? "Working…") : children}
    </button>
  );
}

/** Submit button that asks for confirmation first (for delete / cancel operations). */
export function ConfirmSubmit({ message, children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || rest.disabled}
      className={cn("btn-secondary btn-sm text-red-700 hover:border-red-300 hover:bg-red-50", className)}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      {...rest}
    >
      {pending ? "…" : children}
    </button>
  );
}
