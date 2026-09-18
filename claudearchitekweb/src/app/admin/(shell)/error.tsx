"use client";

/**
 * Error boundary for the admin shell. A server action that throws (an expired session, a value the
 * browser let through, a record deleted in another tab) used to replace the whole page with Next's
 * bare "Application error". Here the admin keeps the chrome, sees what to do next, and can retry.
 */
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui";

// The name of ADMIN_LANG_COOKIE, inlined: i18n/admin.ts reads next/headers and cannot be pulled into a client bundle.
const ADMIN_LANG_COOKIE = "admin_lang";

const WORDS = {
  hy: {
    title: "Ինչ-որ բան չստացվեց",
    body: "Գործողությունը չկատարվեց։ Փորձիր նորից — եթե կրկնվի, թարմացրու էջը կամ մտիր նորից։",
    retry: "Փորձել նորից",
    home: "Դեպի վահանակ",
    login: "Մուտք գործել",
    expired: "Սեսիան ավարտվել է։ Մուտք գործիր նորից։",
    code: "Կոդ",
  },
  en: {
    title: "Something went wrong",
    body: "The action did not go through. Try again — if it keeps happening, reload the page or sign in again.",
    retry: "Try again",
    home: "Back to dashboard",
    login: "Sign in",
    expired: "Your session has expired. Please sign in again.",
    code: "Code",
  },
} as const;

function readLocale(): keyof typeof WORDS {
  if (typeof document === "undefined") return "hy";
  const m = document.cookie.match(new RegExp(`(?:^|; )${ADMIN_LANG_COOKIE}=([^;]*)`));
  return m && m[1] === "en" ? "en" : "hy";
}

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [locale, setLocale] = useState<keyof typeof WORDS>("hy");
  useEffect(() => setLocale(readLocale()), []);
  useEffect(() => {
    console.error(error);
  }, [error]);

  const w = WORDS[locale];
  const expired = /UNAUTHORIZED|session/i.test(error.message ?? "");

  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 px-4 py-16">
      <p className="text-[11px] uppercase tracking-[0.18em] text-fg-3">{w.code} {error.digest ?? "—"}</p>
      <h1 className="font-serif text-2xl text-fg">{w.title}</h1>
      <p className="text-sm leading-relaxed text-fg-2">{expired ? w.expired : w.body}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {expired ? (
          <ButtonLink href="/admin/login">{w.login}</ButtonLink>
        ) : (
          <Button onClick={() => reset()}>{w.retry}</Button>
        )}
        <ButtonLink href="/admin" variant="secondary">
          {w.home}
        </ButtonLink>
      </div>
    </div>
  );
}
