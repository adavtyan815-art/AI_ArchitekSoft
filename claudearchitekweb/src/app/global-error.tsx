"use client";

/**
 * Last-resort boundary: it replaces the root layout, so it brings its own <html>/<body> and stylesheet.
 * Kept deliberately small and dependency-free — it has to render even when everything above it failed.
 */
import "./globals.css";
import { useEffect, useState } from "react";

const WORDS = {
  hy: { title: "Էջը չբացվեց", body: "Ժամանակավոր խնդիր է։ Փորձիր նորից կամ վերադարձիր գլխավոր էջ։", retry: "Փորձել նորից", home: "Գլխավոր", code: "Կոդ" },
  ru: { title: "Страница не открылась", body: "Временная ошибка. Попробуйте ещё раз или вернитесь на главную.", retry: "Попробовать снова", home: "На главную", code: "Код" },
  en: { title: "This page did not load", body: "A temporary problem. Try again, or go back to the home page.", retry: "Try again", home: "Home", code: "Code" },
} as const;

type Lang = keyof typeof WORDS;

function readLang(): Lang {
  if (typeof document === "undefined") return "hy";
  const fromCookie = document.cookie.match(/(?:^|; )admin_lang=([^;]*)/)?.[1];
  if (fromCookie === "en") return "en";
  const path = window.location.pathname.split("/")[1];
  if (path === "ru" || path === "en" || path === "hy") return path;
  const html = document.documentElement.lang;
  return html === "ru" || html === "en" ? html : "hy";
}

/** The theme the visitor chose, when they chose one; otherwise the OS decides, in CSS below. */
function readTheme(): "light" | "dark" | undefined {
  if (typeof document === "undefined") return undefined;
  const c = document.cookie.match(/(?:^|; )theme=(light|dark)/)?.[1];
  return c === "light" || c === "dark" ? c : undefined;
}

/**
 * The palette, in its own <style> rather than in the inline styles below: this boundary must not
 * depend on the app's stylesheet having loaded, and a dark-mode visitor must not get a white flash.
 * Same rule as globals.css — an explicit choice wins, otherwise the OS setting does.
 */
const CSS = `
.ge{--ge-bg:#f4f2ed;--ge-fg:#17150f;--ge-line:rgba(23,21,15,0.25);background:var(--ge-bg);color:var(--ge-fg)}
html[data-theme="dark"] .ge{--ge-bg:#131211;--ge-fg:#efebe3;--ge-line:rgba(239,235,227,0.28)}
@media (prefers-color-scheme:dark){html:not([data-theme="light"]) .ge{--ge-bg:#131211;--ge-fg:#efebe3;--ge-line:rgba(239,235,227,0.28)}}
.ge-btn{background:var(--ge-fg);color:var(--ge-bg);border:1px solid var(--ge-fg)}
.ge-link{color:var(--ge-fg);border:1px solid var(--ge-line)}
`;

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // The language and theme are read after mount: the server render has no cookie or URL to go by,
  // and a mismatch would fail hydration. `lang` drives the markup as well as the words, so a screen
  // reader never pronounces Russian or English text with Armenian phonetics.
  const [lang, setLang] = useState<Lang>("hy");
  const [theme, setTheme] = useState<"light" | "dark" | undefined>(undefined);
  useEffect(() => {
    setLang(readLang());
    setTheme(readTheme());
  }, []);
  useEffect(() => {
    console.error(error);
  }, [error]);
  const w = WORDS[lang];

  return (
    <html lang={lang} data-theme={theme} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body className="ge" style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}>
        <main style={{ maxWidth: "34rem", margin: "0 auto", padding: "4rem 1rem", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1rem" }}>
          <p style={{ margin: 0, fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.55 }}>
            {w.code} {error.digest ?? "—"}
          </p>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 500 }}>{w.title}</h1>
          <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.6, opacity: 0.75 }}>{w.body}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", paddingTop: "0.25rem" }}>
            <button
              type="button"
              onClick={() => reset()}
              className="ge-btn"
              style={{ minHeight: 44, padding: "0 1.1rem", fontSize: "0.9rem", cursor: "pointer" }}
            >
              {w.retry}
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the root layout failed; a full reload is the point, not a client-side transition */}
            <a href="/" className="ge-link" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 1.1rem", fontSize: "0.9rem", textDecoration: "none" }}>
              {w.home}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
