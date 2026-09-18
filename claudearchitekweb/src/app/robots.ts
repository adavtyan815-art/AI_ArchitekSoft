import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/** Rendered per request: APP_URL is a runtime value, and a build-time render would freeze the build machine's URL into the file. */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    // Client pages (/p/, /v/) are deliberately not disallowed. They answer `noindex, nofollow`, and a crawler only
    // honours that when it may fetch the page; a disallowed URL can still be listed from an external link.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${env.appUrl}/sitemap.xml`,
    host: env.appUrl,
  };
}
