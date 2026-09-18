import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";
import { checkAccess, getShareLinkBySlug, passcodeCookieName } from "@/lib/portal";

const LOCALES = ["hy", "ru", "en"];
/**
 * Paths the locale rewrite must leave alone. `/api` and `/media` are also excluded by the matcher
 * below, so their request bodies are never cloned by the middleware runtime (uploads would be cut off).
 */
const PASS = ["/api", "/p/", "/v/", "/media", "/_next", "/favicon", "/robots", "/sitemap", "/brand", "/demo", "/og"];

/**
 * A fresh CSP nonce for this request. 128 bits of randomness, base64 — long enough that it cannot
 * be guessed by a page trying to have its own injected script accepted.
 */
function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * The request headers the app reads to render a page: `x-locale` (public-site language),
 * `x-pathname` (path + query, used for `<html lang>` on admin pages and for the sign-in redirect)
 * and the CSP pair. All of them are rewritten on every request, so a value a client sends can never
 * reach a layout.
 *
 * `content-security-policy` is set on the *request* because that is where Next.js looks for the
 * nonce before it stamps its own script tags with it; `x-nonce` is the same value in the form the
 * root layout can read for its one inline script.
 */
function requestHeaders(req: NextRequest, locale: string | null, pathname: string | null, nonce: string): Headers {
  const h = new Headers(req.headers);
  if (locale) h.set("x-locale", locale);
  else h.delete("x-locale");
  if (pathname) h.set("x-pathname", pathname);
  else h.delete("x-pathname");
  h.set("x-nonce", nonce);
  h.set("content-security-policy", buildCsp(nonce));
  return h;
}

/** The same policy on the way out, so the browser actually enforces it. */
function withCsp(res: NextResponse, nonce: string): NextResponse {
  res.headers.set("Content-Security-Policy", buildCsp(nonce));
  return res;
}

/**
 * A client page carries its key in the URL (`/p/<slug>?k=…`), but the files it shows are loaded from
 * `/media/...`, where that query string is gone — which is why those files used to be served to anyone
 * who knew the path. Copy the key into an HttpOnly cookie so the media route can check which link (and
 * therefore which download permission) the visitor actually holds.
 *
 * The cookie name and format are repeated from `LINK_KEYS_COOKIE` in src/lib/portal.ts, which reads
 * it — keep the two in sync. (`goneResponse` below does import that module for its status check, but
 * this part stays self-contained: it must keep working even if the link lookup ever moves away.)
 */
const LINK_KEYS_COOKIE = "pk";
const LINK_KEYS_MAX = 5;

function rememberLinkKey(req: NextRequest, res: NextResponse): NextResponse {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/p/") && !pathname.startsWith("/v/")) return res;
  const key = req.nextUrl.searchParams.get("k");
  // Tokens are base64url; anything else cannot match a link and is not worth a cookie.
  if (!key || !/^[A-Za-z0-9_-]{8,200}$/.test(key)) return res;
  const seen = (req.cookies.get(LINK_KEYS_COOKIE)?.value ?? "").split(".").filter(Boolean);
  if (seen[0] === key) return res; // already the newest — no Set-Cookie needed
  // Newest first, and a client who was sent several pages keeps the previous ones working.
  const value = [key, ...seen.filter((t) => t !== key)].slice(0, LINK_KEYS_MAX).join(".");
  res.cookies.set({ name: LINK_KEYS_COOKIE, value, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 24 * 3600 });
  return res;
}

/**
 * A client page whose link ran out, or that the studio switched off, still renders its own
 * "no longer available" card — but it must not answer 200, or a link checker, a chat app unfurling
 * the link and uptime monitoring cannot tell a dead client link from a live one. 410 Gone says "this
 * address was real and is finished", which is exactly what a used-up share link is.
 *
 * The App Router gives a page no way to set a response status (next/navigation offers 404/403/401
 * only), and the router copies the middleware response's status before it renders the matched route,
 * so this is the one place the status line can change while the page renders exactly as today.
 * Reading the link here is possible because this middleware runs on the Node runtime (see
 * `config.runtime` below) and reuses the same process-wide connection as the page, and `checkAccess`
 * is the same check the page makes, so the two can never disagree. It costs one indexed single-row
 * SELECT, and only on /p and /v paths.
 */
function goneResponse(req: NextRequest, pathname: string, nonce: string): NextResponse | null {
  const m = /^\/[pv]\/([^/]+)\/?$/.exec(pathname);
  if (!m) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(m[1]);
  } catch {
    return null; // a malformed escape is not a link we know
  }
  const link = getShareLinkBySlug(slug);
  if (!link) return null;
  const access = checkAccess(link, req.nextUrl.searchParams.get("k"), req.cookies.get(passcodeCookieName(link.id))?.value ?? null);
  if (access !== "expired" && access !== "inactive") return null;
  return NextResponse.next({ status: 410, request: { headers: requestHeaders(req, null, null, nonce) } });
}

/**
 * - Admin: pages under /admin (except /admin/login) require the session cookie; the real check happens in the
 *   layout. The admin interface has no locale in the URL, so `<html lang>` follows the admin_lang cookie and
 *   `x-locale` is removed here.
 * - Public site: `/` and unprefixed paths are Armenian (rewritten to /hy/...), `/ru/...` and `/en/...` stay.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // One nonce per request, used by the request headers Next renders with and by the response the
  // browser enforces. A redirect carries no document, so it needs neither.
  const nonce = makeNonce();

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const here = `${pathname}${search}`;
    if (pathname !== "/admin/login" && !req.cookies.get("at_admin")?.value) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      // The deep link's own query belongs inside `next`, not on the login page itself.
      url.search = "";
      if (pathname !== "/admin") url.searchParams.set("next", here);
      return NextResponse.redirect(url);
    }
    return withCsp(NextResponse.next({ request: { headers: requestHeaders(req, null, here, nonce) } }), nonce);
  }

  if (PASS.some((p) => pathname.startsWith(p)) || /\.[a-z0-9]+$/i.test(pathname)) {
    const res = goneResponse(req, pathname, nonce) ?? NextResponse.next({ request: { headers: requestHeaders(req, null, null, nonce) } });
    return rememberLinkKey(req, withCsp(res, nonce));
  }

  const first = pathname.split("/")[1];
  if (LOCALES.includes(first)) {
    if (first === "hy") {
      // canonical Armenian URLs have no prefix
      const url = req.nextUrl.clone();
      url.pathname = pathname.replace(/^\/hy/, "") || "/";
      return NextResponse.redirect(url, 308);
    }
    return withCsp(NextResponse.next({ request: { headers: requestHeaders(req, first, pathname, nonce) } }), nonce);
  }

  const url = req.nextUrl.clone();
  url.pathname = `/hy${pathname === "/" ? "" : pathname}`;
  return withCsp(NextResponse.rewrite(url, { request: { headers: requestHeaders(req, "hy", pathname, nonce) } }), nonce);
}

export const config = { matcher: ["/((?!_next/static|_next/image|api/|media/|favicon.ico).*)"], runtime: "nodejs" };
