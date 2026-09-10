import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["hy", "ru", "en"];
const PASS = ["/admin", "/api", "/p/", "/media", "/_next", "/favicon", "/robots", "/sitemap", "/brand", "/demo", "/og"];

/**
 * - Public site: `/` and unprefixed paths are Armenian (rewritten to /hy/...), `/ru/...` and `/en/...` stay.
 * - Admin: pages under /admin (except /admin/login) require the session cookie; the real check happens in the layout.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!req.cookies.get("at_admin")?.value) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  if (PASS.some((p) => pathname.startsWith(p)) || /\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next();
  const first = pathname.split("/")[1];
  if (LOCALES.includes(first)) {
    if (first === "hy") {
      // canonical Armenian URLs have no prefix
      const url = req.nextUrl.clone();
      url.pathname = pathname.replace(/^\/hy/, "") || "/";
      return NextResponse.redirect(url, 308);
    }
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = `/hy${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"], runtime: "nodejs" };
