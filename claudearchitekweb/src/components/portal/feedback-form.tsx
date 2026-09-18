"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "approve" | "change" | "question";

export type FeedbackLabels = {
  title: string;
  variants: string;
  approve: string;
  change: string;
  question: string;
  placeholder: string;
  /** Label of the message box when approving: the text is a comment, not a change request. */
  commentOptional: string;
  contact: string;
  send: string;
  sending: string;
  thanks: string;
  approvedThanks: string;
  optional: string;
  error: string;
};

/**
 * The client's decision, sent to /api/portal/[slug]/feedback.
 *
 * The options follow the project: "I approve this option" is offered only while the
 * project is actually waiting for a decision and has not been approved yet, so a client
 * whose kitchen is already in production is not invited to approve it a second time.
 * After a successful send the server data is refreshed, so the approved badge and the
 * stage ruler above update without a manual reload.
 */
export function FeedbackForm({
  slug,
  token,
  labels,
  defaultContact,
  canApprove = true,
}: {
  slug: string;
  token: string;
  labels: FeedbackLabels;
  defaultContact?: string | null;
  /** False once the project is approved or has moved past the approval stage. */
  canApprove?: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind | null>(null);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState(defaultContact ?? "");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [doneKind, setDoneKind] = useState<Kind | null>(null);
  const [, startRefresh] = useTransition();

  const options: { key: Kind; label: string }[] = [
    ...(canApprove ? [{ key: "approve" as const, label: labels.approve }] : []),
    { key: "change", label: labels.change },
    { key: "question", label: labels.question },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!kind || state === "sending") return;
    if (kind !== "approve" && !message.trim()) return;
    setState("sending");
    try {
      const res = await fetch(`/api/portal/${encodeURIComponent(slug)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k: token, type: kind, message: message.trim(), contact: contact.trim() }),
      });
      // 409: the project was already approved (another device, or a double tap).
      // The decision stands, so the client sees the same confirmation, not an error.
      if (!res.ok && res.status !== 409) throw new Error(String(res.status));
      setDoneKind(kind);
      setState("done");
      // Pull the fresh server state: approved badge, stage ruler, the list of earlier messages.
      startRefresh(() => router.refresh());
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-start gap-4 border-y border-success/40 bg-success-soft px-5 py-6" role="status">
        <Check size={20} strokeWidth={2} className="mt-0.5 flex-none text-success" aria-hidden />
        <p className="text-[15px] leading-relaxed text-fg">{doneKind === "approve" ? labels.approvedThanks : labels.thanks}</p>
      </div>
    );
  }

  const canSend = !!kind && (kind === "approve" || message.trim().length > 0);
  const messageLabel = kind === "approve" ? labels.commentOptional : labels.placeholder;

  return (
    <form onSubmit={submit}>
      <fieldset className="border-0 p-0">
        <legend className="kicker mb-3">{labels.variants}</legend>
        <div className="grid gap-2">
          {options.map((o, i) => (
            <label key={o.key} className="choice group min-h-[56px] items-center gap-4 has-[:focus-visible]:border-fg has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-accent-soft">
              <input type="radio" name="portal-feedback-kind" value={o.key} className="sr-only" checked={kind === o.key} onChange={() => setKind(o.key)} />
              <span className="index flex-none">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 font-display text-[1.15rem] leading-tight text-fg">{o.label}</span>
              {/* One choice out of three: a round radio ring, the same indicator the public wizard uses. */}
              <span aria-hidden className={cn("relative h-[18px] w-[18px] flex-none rounded-full border-[1.5px] transition-colors", kind === o.key ? "border-fg" : "border-line-strong")}>
                <span className={cn("absolute inset-[3px] rounded-full bg-accent transition-transform", kind === o.key ? "scale-100" : "scale-0")} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {kind ? (
        <div className="mt-6 space-y-4">
          <label className="block">
            {/* Approving shows the label: a half-written change request must not be sent as an unexplained comment. */}
            <span className={cn("label", kind !== "approve" && "sr-only")}>
              {messageLabel}
              {kind === "approve" ? <span className="font-normal tracking-normal text-faint normal-case"> ({labels.optional})</span> : null}
            </span>
            <textarea className="input min-h-[120px] text-[15px]" placeholder={messageLabel} value={message} onChange={(e) => setMessage(e.target.value)} required={kind !== "approve"} maxLength={4000} />
          </label>
          <label className="block">
            <span className="label">
              {labels.contact} <span className="font-normal tracking-normal text-faint normal-case">({labels.optional})</span>
            </span>
            <input className="input text-[15px]" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} autoComplete="tel" />
          </label>
          {state === "error" ? (
            <p role="alert" className="text-sm wrap-anywhere text-danger">
              {labels.error}
            </p>
          ) : null}
          <button type="submit" disabled={!canSend || state === "sending"} className={cn("btn-lg min-h-[52px] w-full sm:w-auto", kind === "approve" ? "btn bg-success text-bg hover:opacity-90" : "btn-primary")}>
            {state === "sending" ? labels.sending : kind === "approve" ? labels.approve : labels.send}
          </button>
        </div>
      ) : null}
    </form>
  );
}
