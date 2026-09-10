"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { Dictionary, Locale } from "@/lib/i18n";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { trackEvent } from "@/components/site/track";
import { cn } from "@/lib/utils";

type Segment = "b2c" | "b2b";

export function ContactForm({ locale, dict, className }: { locale: Locale; dict: Dictionary; className?: string }) {
  const c = dict.contact;
  const [segment, setSegment] = useState<Segment>("b2c");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const started = useRef(false);

  const onFocus = () => {
    if (started.current) return;
    started.current = true;
    trackEvent("form_start", { locale, segment, meta: { form: "contact" } });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment, name, phone, email, message, website, language: locale, pagePath: window.location.pathname, source: "website" }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      setState(res.ok && data.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className={cn("rounded-2xl border border-brand-200 bg-brand-50 p-6", className)}>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-500 text-white">
            <Check size={18} strokeWidth={3} />
          </span>
          <p className="text-ink-900">{c.success}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={cn("space-y-5", className)} onFocusCapture={onFocus}>
      <div>
        <span className="label">{c.segment}</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["b2c", c.segB2c],
              ["b2b", c.segB2b],
            ] as [Segment, string][]
          ).map(([val, label]) => (
            <label key={val} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors", segment === val ? "border-ink-950 bg-ink-950 text-white" : "border-ink-200 bg-white text-ink-800 hover:border-ink-300")}>
              <input type="radio" name="segment" value={val} checked={segment === val} onChange={() => setSegment(val)} className="sr-only" />
              <span className={cn("inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border", segment === val ? "border-white" : "border-ink-300")}>{segment === val ? <span className="h-2 w-2 rounded-full bg-white" /> : null}</span>
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={c.name} required>
          <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" />
        </Field>
        <Field label={c.phone} required>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={40} autoComplete="tel" inputMode="tel" />
        </Field>
      </div>
      <Field label={c.email} hint={dict.common.optional}>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" />
      </Field>
      <Field label={c.message}>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} />
      </Field>
      {/* honeypot — hidden from humans */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      {state === "error" ? <p className="text-sm text-danger-500">{c.error}</p> : null}

      <Button type="submit" size="lg" disabled={state === "sending"} className="w-full sm:w-auto">
        {state === "sending" ? dict.common.sending : dict.common.send}
        <ArrowRight size={18} />
      </Button>
    </form>
  );
}
