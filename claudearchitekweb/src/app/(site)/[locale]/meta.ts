import type { Metadata } from "next";
import { LOCALES, localePath, type Locale } from "@/lib/i18n";

const SITE_NAME = "ArchiTek Soft";
const DEFAULT_OG_IMAGE = "/brand/share.jpg";

/**
 * Metadata for one public page.
 *
 * Keeps three things consistent that are easy to get wrong per page:
 * - `alternates` (canonical + hreflang) must point at *this* path in every
 *   locale, not at the home page;
 * - `openGraph` in a nested route replaces the parent's object wholesale, so
 *   every page has to repeat siteName/images or the share card loses them;
 * - the OG title carries the brand suffix that `title.template` adds to <title>.
 */
export function pageMeta({
  locale,
  path,
  title,
  description,
  images,
}: {
  locale: Locale;
  /** Locale-less path, e.g. "/kitchenpro". */
  path: string;
  title: string;
  description?: string;
  images?: string[];
}): Metadata {
  const url = localePath(locale, path);
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(LOCALES.map((l) => [l, localePath(l, path)])),
    },
    openGraph: {
      title: `${title} — ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      locale,
      type: "website",
      images: images?.length ? images : [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${SITE_NAME}`,
      description,
      images: images?.length ? images : [DEFAULT_OG_IMAGE],
    },
  };
}
