import { THEME_SCRIPT_CSP_HASH } from "./theme-script";

/**
 * Content-Security-Policy.
 *
 * Pages get a per-request nonce (see src/middleware.ts). Next.js reads the nonce out of the
 * `Content-Security-Policy` *request* header and stamps it on every script it renders; the one
 * inline script this app writes itself — the pre-paint theme script — is allowed by its hash
 * instead (see src/lib/theme-script.ts). `'strict-dynamic'` then covers the scripts those trusted
 * scripts load (Next's own chunks, and model-viewer from jsdelivr via next/script), so no script
 * host has to be listed and an injected `<script src="…">` still cannot run.
 *
 * `'self' https:` are there only for browsers that do not understand `'strict-dynamic'` and ignore
 * the nonce; browsers that do understand it ignore these two in turn.
 *
 * Styles keep `'unsafe-inline'`: the app styles elements with `style={{…}}` in many places, and the
 * global-error boundary carries its own <style> so it can paint without the stylesheet.
 *
 * What this is really for: `frame-ancestors`, `base-uri`, `object-src` and `form-action` — the
 * directives that stop clickjacking, a planted <base>, a plugin document and a form posting the
 * visitor's answers to someone else's server.
 */

/** Everything the 3D/AR path may fetch besides our own origin. */
const MODEL_VIEWER = ["https://cdn.jsdelivr.net", "https://www.gstatic.com"];

export function buildCsp(nonce: string, dev = process.env.NODE_ENV !== "production"): string {
  const script = ["'self'", `'nonce-${nonce}'`, THEME_SCRIPT_CSP_HASH, "'strict-dynamic'", "'wasm-unsafe-eval'", "https:"];
  // The dev server compiles with eval() and talks to the client over a websocket.
  if (dev) script.push("'unsafe-eval'");
  const connect = ["'self'", "blob:", "data:", ...MODEL_VIEWER];
  if (dev) connect.push("ws:", "wss:");

  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'self'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'none'",
    "object-src 'none'",
  ].join("; ");
}

/**
 * `/api/*` never passes through the middleware (it is outside the matcher, so upload bodies are not
 * cloned), and it only ever answers JSON or plain text — never a document that could run anything.
 * So it is locked down flat instead of being given a nonce. Set from next.config.ts.
 *
 * `/media/*` is left alone on purpose: it hands the browser a PDF, a video or a GLB to open with a
 * built-in viewer, and those viewers are the sort of thing a blanket `default-src 'none'` breaks.
 * Nothing served from there is HTML — unknown extensions fall back to application/octet-stream —
 * and every response already carries `X-Content-Type-Options: nosniff`.
 */
export const NON_DOCUMENT_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
