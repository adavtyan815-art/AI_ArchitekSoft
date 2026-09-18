import { relTime } from "@/lib/admin-helpers";
import type { AdminLocale } from "@/lib/i18n/admin";

/**
 * A relative timestamp ("5 min ago", «5 ր առաջ»).
 *
 * The text is read from the clock at render time, and the dev server renders a page twice (the
 * streamed HTML and the RSC payload the client hydrates from). When those two passes land on
 * opposite sides of a minute boundary the strings differ and React reports a hydration mismatch on
 * a page that is in fact correct. `suppressHydrationWarning` silences that one text node — React
 * still replaces it with the client's value — without hiding a real mismatch anywhere else.
 *
 * Use this instead of calling relTime() straight into JSX.
 */
export function RelTime({ iso, locale, className, title }: { iso: string | null | undefined; locale: AdminLocale; className?: string; title?: string }) {
  return (
    <span suppressHydrationWarning className={className} title={title}>
      {relTime(iso, locale)}
    </span>
  );
}
