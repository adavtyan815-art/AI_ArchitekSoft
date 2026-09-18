"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { Button, Field, Index, Input, Textarea } from "@/components/ui";
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
  /** Own field: a handle typed into the phone box never reaches anyone. */
  telegram: string;
  /** Asked of makers and showrooms, so converting the lead creates the company. */
  company: string;
  email: string;
  message: string;
  success: string;
  error: string;
  nameRequired: string;
  requestNo: string;
  optional: string;
  send: string;
  sending: string;
};

export function ContactForm({ locale, strings, className }: { locale: Locale; strings: ContactFormStrings; className?: string }) {
  const c = strings;
  const uid = useId();
  const [segment, setSegment] = useState<Segment>("b2c");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [code, setCode] = useState("");
  const [nameError, setNameError] = useState(false);
  const started = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);

  // The form is replaced by the confirmation, so focus would fall back to <body>.
  useEffect(() => {
    if (state === "done") doneRef.current?.focus({ preventScroll: true });
  }, [state]);

  const onFocus = () => {
    if (started.current) return;
    started.current = true;
    trackEvent("form_start", { locale, segment, meta: { form: "contact" } });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    if (!name.trim()) {
      setNameError(true);
      nameRef.current?.focus();
      return;
    }
    setNameError(false);
    setState("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment,
          name,
          companyName: segment === "b2b" ? company : undefined,
          phone,
          telegram,
          email,
          message,
          website,
          language: locale,
          pagePath: window.location.pathname,
          source: "website",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; code?: string; issues?: { path?: string }[] };
      if (res.ok && data.ok) {
        setCode(data.code ?? "");
        setState("done");
        return;
      }
      // a field-level answer where the API gave one, instead of "something went wrong"
      if (data.issues?.some((i) => i.path === "name")) {
        setNameError(true);
        setState("idle");
        nameRef.current?.focus();
        return;
      }
      setState("error");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className={cn("border-t border-success pt-6", className)} role="status">
        <div className="flex items-start gap-3">
          <Check size={18} strokeWidth={2.5} className="mt-0.5 flex-none text-success" aria-hidden />
          <p ref={doneRef} tabIndex={-1} className="text-[15px] leading-relaxed text-fg focus:outline-none">
            {c.success}
          </p>
        </div>
        {code ? (
          <p className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="caption">{c.requestNo}</span>
            <span className="font-mono text-[1.5rem] leading-none tracking-[0.06em] text-fg tabular-nums">{code}</span>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={cn("space-y-6", className)} onFocusCapture={onFocus}>
      <div>
        <span className="label" id={`${uid}-segment`}>
          {c.segment}
        </span>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-labelledby={`${uid}-segment`}>
          {(
            [
              ["b2c", c.segB2c],
              ["b2b", c.segB2b],
            ] as [Segment, string][]
          ).map(([val, label], i) => (
            <label key={val} className="choice items-center gap-3 py-3.5 text-[15px] leading-snug font-medium text-fg">
              <input type="radio" name="segment" value={val} checked={segment === val} onChange={() => setSegment(val)} className="sr-only" />
              <Index n={i + 1} className={cn("flex-none", segment !== val && "text-faint")} />
              {/* one of two: a round ring that fills, the same indicator the start wizard uses */}
              <span className={cn("relative h-4 w-4 flex-none rounded-full border-[1.5px] transition-colors", segment === val ? "border-fg" : "border-line-strong")} aria-hidden>
                <span className={cn("absolute inset-[2.5px] rounded-full bg-accent transition-transform", segment === val ? "scale-100" : "scale-0")} />
              </span>
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid items-end gap-5 sm:grid-cols-2">
        <Field label={c.name} required error={nameError ? c.nameRequired : undefined}>
          <Input
            ref={nameRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(false);
            }}
            required
            maxLength={120}
            autoComplete="name"
            aria-invalid={nameError || undefined}
          />
        </Field>
        <Field label={c.phone} required>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={40} autoComplete="tel" inputMode="tel" placeholder="+374" />
        </Field>
      </div>
      {segment === "b2b" ? (
        <Field label={c.company}>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} autoComplete="organization" />
        </Field>
      ) : null}
      <div className="grid items-end gap-5 sm:grid-cols-2">
        {/* Telegram has its own box: typed into the phone field a handle is stored as a phone number
            and nobody can call or message it. Plain text, so the phone keypad never opens here. */}
        <Field label={c.telegram} hint={c.optional}>
          <Input type="text" value={telegram} onChange={(e) => setTelegram(e.target.value)} maxLength={60} placeholder="@" />
        </Field>
        <Field label={c.email} hint={c.optional}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" />
        </Field>
      </div>
      <Field label={c.message}>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} />
      </Field>
      {/* honeypot — hidden from humans */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      {state === "error" ? (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          {c.error}
        </p>
      ) : null}

      <div className="flex items-center gap-4 border-t border-line pt-6">
        <Button type="submit" size="lg" disabled={state === "sending"} className="w-full sm:w-auto">
          {state === "sending" ? c.sending : c.send}
          <ArrowRight size={18} />
        </Button>
      </div>
    </form>
  );
}
