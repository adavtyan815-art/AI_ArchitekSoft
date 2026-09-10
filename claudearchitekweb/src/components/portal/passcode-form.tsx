"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

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
    <form onSubmit={submit} className="card mx-auto w-full max-w-md p-6 sm:p-8">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-fg" aria-hidden>
        <Lock size={22} />
      </span>
      <h1 className="h-section mt-4 text-[1.6rem] sm:text-[1.9rem]">{labels.title}</h1>
      <p className="mt-2 text-muted">{labels.text}</p>
      <input
        className="input mt-5 text-center text-2xl tracking-[0.4em]"
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
        <p role="alert" className="mt-2 text-sm text-danger">
          {labels.wrong}
        </p>
      ) : null}
      <button type="submit" disabled={!code.trim() || state === "sending"} className="btn-primary btn-lg mt-4 min-h-[52px] w-full">
        {labels.button}
      </button>
    </form>
  );
}
