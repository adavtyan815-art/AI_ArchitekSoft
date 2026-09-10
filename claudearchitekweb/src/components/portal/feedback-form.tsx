"use client";

import { useState } from "react";
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
  contact: string;
  send: string;
  sending: string;
  thanks: string;
  approvedThanks: string;
  optional: string;
  error: string;
};

/** Approve / change / question — the client's decision, sent to /api/portal/[slug]/feedback. */
export function FeedbackForm({ slug, token, labels, defaultContact }: { slug: string; token: string; labels: FeedbackLabels; defaultContact?: string | null }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState(defaultContact ?? "");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [doneKind, setDoneKind] = useState<Kind | null>(null);

  const options: { key: Kind; label: string }[] = [
    { key: "approve", label: labels.approve },
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
      if (!res.ok) throw new Error(String(res.status));
      setDoneKind(kind);
      setState("done");
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
              <span aria-hidden className="flex h-5 w-5 flex-none items-center justify-center rounded-sm border border-line-strong text-bg transition-colors group-has-[:checked]:border-fg group-has-[:checked]:bg-fg">
                <Check size={13} strokeWidth={3} className="opacity-0 transition-opacity group-has-[:checked]:opacity-100" />
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {kind ? (
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="sr-only">{labels.placeholder}</span>
            <textarea className="input min-h-[120px] text-[15px]" placeholder={labels.placeholder} value={message} onChange={(e) => setMessage(e.target.value)} required={kind !== "approve"} maxLength={4000} />
          </label>
          <label className="block">
            <span className="label">
              {labels.contact} <span className="font-normal tracking-normal text-faint normal-case">({labels.optional})</span>
            </span>
            <input className="input text-[15px]" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} autoComplete="tel" />
          </label>
          {state === "error" ? (
            <p role="alert" className="text-sm text-danger">
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
