"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { trackEvent } from "@/components/site/track";
import { cn } from "@/lib/utils";

type Segment = "b2c" | "b2b";

/** Only the strings this form needs — keeps the client payload small. */
export type ContactFormStrings = {
  segment: string;
  segB2b: string;
  segB2c: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  success: string;
  error: string;
  optional: string;
  send: string;
  sending: string;
};

export function ContactForm({ locale, strings, className }: { locale: Locale; strings: ContactFormStrings; className?: string }) {
  const c = strings;
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
      <div className={cn("rounded-2xl bg-success-soft p-6", className)}>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-success text-[#fff]">
            <Check size={18} strokeWidth={3} />
          </span>
          <p className="text-[15px] leading-relaxed text-fg">{c.success}</p>
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
            <label key={val} className="choice items-center py-3.5 text-[15px] font-medium text-fg">
              <input type="radio" name="segment" value={val} checked={segment === val} onChange={() => setSegment(val)} className="sr-only" />
              <span className={cn("inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border transition-colors", segment === val ? "border-accent bg-accent" : "border-line-strong")}>
                {segment === val ? <span className="h-2 w-2 rounded-full bg-accent-fg" /> : null}
              </span>
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
      <Field label={c.email} hint={c.optional}>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" />
      </Field>
      <Field label={c.message}>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} />
      </Field>
      {/* honeypot — hidden from humans */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      {state === "error" ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {c.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={state === "sending"} className="w-full sm:w-auto">
        {state === "sending" ? c.sending : c.send}
        <ArrowRight size={18} />
      </Button>
    </form>
  );
}
