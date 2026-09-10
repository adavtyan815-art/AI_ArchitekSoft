"use client";

import { useState } from "react";
import { CheckCircle2, HelpCircle, PencilLine, ThumbsUp } from "lucide-react";
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

  const options: { key: Kind; label: string; icon: typeof ThumbsUp; tone: string }[] = [
    { key: "approve", label: labels.approve, icon: ThumbsUp, tone: "bg-success-soft text-success" },
    { key: "change", label: labels.change, icon: PencilLine, tone: "bg-warning-soft text-warning" },
    { key: "question", label: labels.question, icon: HelpCircle, tone: "bg-accent-soft text-accent-soft-fg" },
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
      <div className="card flex items-start gap-4 border-success/40 bg-success-soft p-5 sm:p-6" role="status">
        <CheckCircle2 className="mt-0.5 flex-none text-success" size={24} aria-hidden />
        <p className="text-base leading-relaxed text-fg">{doneKind === "approve" ? labels.approvedThanks : labels.thanks}</p>
      </div>
    );
  }

  const canSend = !!kind && (kind === "approve" || message.trim().length > 0);

  return (
    <form onSubmit={submit} className="card p-4 sm:p-6">
      <fieldset className="border-0 p-0">
        <legend className="kicker mb-2.5">{labels.variants}</legend>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {options.map((o) => (
            <label key={o.key} className="choice min-h-[60px] items-center gap-3 has-[:focus-visible]:border-accent has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent-soft sm:min-h-[104px] sm:flex-col sm:items-start sm:justify-center">
              <input type="radio" name="portal-feedback-kind" value={o.key} className="sr-only" checked={kind === o.key} onChange={() => setKind(o.key)} />
              <span className={cn("inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl", o.tone)} aria-hidden>
                <o.icon size={18} />
              </span>
              <span className="text-[15px] leading-snug font-semibold text-fg">{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {kind ? (
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="sr-only">{labels.placeholder}</span>
            <textarea className="input min-h-[120px] text-base" placeholder={labels.placeholder} value={message} onChange={(e) => setMessage(e.target.value)} required={kind !== "approve"} maxLength={4000} />
          </label>
          <label className="block">
            <span className="label">
              {labels.contact} <span className="font-normal tracking-normal text-faint normal-case">({labels.optional})</span>
            </span>
            <input className="input text-base" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} autoComplete="tel" />
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
