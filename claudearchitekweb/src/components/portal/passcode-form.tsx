"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type PasscodeLabels = {
  title: string;
  text: string;
  button: string;
  /** The code was rejected by the server. */
  wrong: string;
  /** The request itself failed (offline, 500…): not the same thing as a wrong code. */
  error: string;
  /** Too many wrong codes in a row: the API answers 429 with the wait in seconds. */
  /** Template with "{m}" for the minutes left (functions cannot be passed from a server component). */
  locked: string;
  /** Where to find the code, e.g. "The code is in the same message as your link." */
  hint: string;
  sending: string;
};

/**
 * Centred, narrow access panel: mono hint, serif title, one code field.
 * Codes may be alphanumeric, so the field asks for a normal keyboard (a numeric
 * keypad makes letters untypeable on iOS) and upper-cases what the user types.
 * `children` is the way out for a client who never received a code (contact rows).
 */
export function PasscodeForm({ slug, token, labels, children }: { slug: string; token: string; labels: PasscodeLabels; children?: ReactNode }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "wrong" | "error" | "locked">("idle");
  const [lockMinutes, setLockMinutes] = useState(1);
  const [refreshing, startRefresh] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const busy = state === "sending" || refreshing;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setState("sending");
    try {
      const res = await fetch(`/api/portal/${encodeURIComponent(slug)}/passcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k: token, passcode: code.trim() }),
      });
      if (res.status === 401) {
        setState("wrong");
        // Let the client retype straight away instead of clearing the field by hand.
        input.current?.focus();
        input.current?.select();
        return;
      }
      if (res.status === 429) {
        // The route locks a link/address after 5 wrong codes and returns { error: "locked", retryAfterSec }.
        // Without this the client saw "Wrong code." and kept typing into a lock.
        const body = (await res.json().catch(() => null)) as { retryAfterSec?: unknown } | null;
        const sec = typeof body?.retryAfterSec === "number" && body.retryAfterSec > 0 ? body.retryAfterSec : 60;
        setLockMinutes(Math.max(1, Math.ceil(sec / 60)));
        setState("locked");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      // The cookie is set: re-render the page. If it still asks for a code (cookies
      // blocked), the form must be usable again rather than stuck on "sending".
      setState("idle");
      startRefresh(() => router.refresh());
    } catch {
      setState("error");
      input.current?.focus();
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-sm text-center">
      <h1 className="h-sub">{labels.title}</h1>
      <p className="caption mx-auto mt-4 max-w-[22rem]">{labels.text}</p>
      <div className="mx-auto mt-8 h-px w-16 bg-line-strong" aria-hidden />
      <input
        ref={input}
        id="portal-passcode"
        className="input mt-8 h-14 text-center font-mono text-2xl tracking-[0.4em] uppercase"
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="one-time-code"
        aria-label={labels.title}
        aria-describedby="portal-passcode-hint"
        autoFocus
        maxLength={12}
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          if (state !== "idle" && state !== "sending") setState("idle");
        }}
        aria-invalid={state === "wrong" || state === "locked" || undefined}
      />
      <p id="portal-passcode-hint" className="caption mt-3">
        {labels.hint}
      </p>
      {state === "wrong" || state === "error" || state === "locked" ? (
        <p role="alert" className="mt-3 font-mono text-[12px] tracking-[0.06em] wrap-anywhere text-danger">
          {state === "wrong" ? labels.wrong : state === "locked" ? labels.locked.replace("{m}", String(lockMinutes)) : labels.error}
        </p>
      ) : null}
      <button type="submit" disabled={!code.trim() || busy || state === "locked"} className="btn-primary btn-lg mt-5 min-h-[52px] w-full">
        {busy ? labels.sending : labels.button}
      </button>
      {children ? <div className="mt-10 text-left">{children}</div> : null}
    </form>
  );
}
