import { createHash } from "node:crypto";

/**
 * Applies the saved theme before first paint (no flash) and marks the document as JS-capable
 * (scroll reveals). Rendered inline in the root layout — it has to run before the first byte of
 * body is painted, so it cannot be a separate request.
 */
export const THEME_SCRIPT = `(function(){try{document.documentElement.setAttribute("data-js","1");var c=document.cookie.match(/(?:^|; )theme=(light|dark)/);var t=c?c[1]:localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

/**
 * Its CSP source expression. A hash rather than the per-request nonce every other script gets:
 * the browser blanks a script's `nonce` *attribute* as soon as the document is parsed, which React
 * then reports as a server/client mismatch on this one tag. The text is a constant, so a hash says
 * the same thing with nothing to hydrate. `'strict-dynamic'` leaves hash sources in force.
 */
export const THEME_SCRIPT_CSP_HASH = `'sha256-${createHash("sha256").update(THEME_SCRIPT, "utf8").digest("base64")}'`;
