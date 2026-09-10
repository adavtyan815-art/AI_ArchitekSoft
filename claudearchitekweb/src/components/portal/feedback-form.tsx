"use client";

import { useState } from "react";
import { CheckCircle2, HelpCircle, PencilLine, ThumbsUp } from "lucide-react";

type Kind = "approve" | "change" | "question";

export type FeedbackLabels = {
  title: string;
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

export function FeedbackForm({ slug, token, labels, defaultContact }: { slug: string; token: string; labels: FeedbackLabels; defaultContact?: string | null }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState(defaultContact ?? "");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [doneKind, setDoneKind] = useState<Kind | null>(null);

  const options: { key: Kind; label: string; icon: typeof ThumbsUp; tone: string }[] = [
    { key: "approve", label: labels.approve, icon: ThumbsUp, tone: "border-green-200 bg-green-50 text-green-800 data-[active=true]:border-green-500 data-[active=true]:ring-2 data-[active=true]:ring-green-200" },
    { key: "change", label: labels.change, icon: PencilLine, tone: "border-amber-200 bg-amber-50 text-amber-800 data-[active=true]:border-amber-500 data-[active=true]:ring-2 data-[active=true]:ring-amber-200" },
    { key: "question", label: labels.question, icon: HelpCircle, tone: "border-brand-200 bg-brand-50 text-brand-800 data-[active=true]:border-brand-500 data-[active=true]:ring-2 data-[active=true]:ring-brand-200" },
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
      <div className="card flex items-start gap-4 border-green-200 bg-green-50 p-5 sm:p-6">
        <CheckCircle2 className="mt-0.5 flex-none text-green-600" size={24} />
        <p className="text-base leading-relaxed text-green-900">{doneKind === "approve" ? labels.approvedThanks : labels.thanks}</p>
      </div>
    );
  }

  const canSend = !!kind && (kind === "approve" || message.trim().length > 0);

  return (
    <form onSubmit={submit} className="card p-5 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            data-active={kind === o.key}
            onClick={() => setKind(o.key)}
            className={`flex min-h-[64px] items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:min-h-[88px] sm:flex-col sm:items-start sm:justify-center ${o.tone}`}
          >
            <o.icon size={22} className="flex-none" />
            <span>{o.label}</span>
          </button>
        ))}
      </div>

      {kind ? (
        <div className="mt-5 space-y-4">
          <textarea
            className="input min-h-[120px] text-base"
            placeholder={labels.placeholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required={kind !== "approve"}
            maxLength={4000}
          />
          <label className="block">
            <span className="label">
              {labels.contact} <span className="font-normal normal-case tracking-normal text-ink-400">({labels.optional})</span>
            </span>
            <input className="input text-base" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} autoComplete="tel" />
          </label>
          {state === "error" ? <p className="text-sm text-danger-500">{labels.error}</p> : null}
          <button type="submit" disabled={!canSend || state === "sending"} className={`btn-lg w-full sm:w-auto ${kind === "approve" ? "btn bg-green-600 text-white hover:bg-green-700" : "btn-primary"}`}>
            {state === "sending" ? labels.sending : kind === "approve" ? labels.approve : labels.send}
          </button>
        </div>
      ) : null}
    </form>
  );
}
