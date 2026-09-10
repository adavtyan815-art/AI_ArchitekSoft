"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Centred, narrow access panel: mono hint, serif title, one code field. */
export function PasscodeForm({ slug, token, labels }: { slug: string; token: string; labels: { title: string; text: string; button: string; wrong: string } }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "wrong" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch(`/api/portal/${encodeURIComponent(slug)}/passcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k: token, passcode: code.trim() }),
      });
      if (res.status === 401) {
        setState("wrong");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-sm text-center">
      <h1 className="h-sub">{labels.title}</h1>
      <p className="caption mx-auto mt-4 max-w-[22rem]">{labels.text}</p>
      <div className="mx-auto mt-8 h-px w-16 bg-line-strong" aria-hidden />
      <input
        className="input mt-8 h-14 text-center font-mono text-2xl tracking-[0.4em]"
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label={labels.title}
        autoFocus
        maxLength={12}
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          if (state === "wrong") setState("idle");
        }}
        aria-invalid={state === "wrong"}
      />
      {state === "wrong" || state === "error" ? (
        <p role="alert" className="mt-3 font-mono text-[12px] tracking-[0.06em] text-danger">
          {labels.wrong}
        </p>
      ) : null}
      <button type="submit" disabled={!code.trim() || state === "sending"} className="btn-primary btn-lg mt-5 min-h-[52px] w-full">
        {labels.button}
      </button>
    </form>
  );
}
