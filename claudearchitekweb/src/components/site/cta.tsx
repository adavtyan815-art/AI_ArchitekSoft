"use client";

import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui";
import { trackEvent } from "@/components/site/track";
import type { Locale } from "@/lib/i18n";

type Variant = "primary" | "brand" | "secondary" | "ghost" | "soft" | "danger";
type Size = "sm" | "md" | "lg";

/**
 * The primary call to action of a public section, with the click counted.
 *
 * `cta_click` is one of the three events a browser may report to /api/track (the other two are the
 * page view and the start of a form); everything that decides money — submitted leads, portal
 * actions — is written by the server. The label is the visible text, so the analytics page can tell
 * "Start a project" in the hero from the same words at the foot of a page.
 */
export function TrackedCta({
  href,
  label,
  locale,
  segment,
  variant,
  size,
  className,
  children,
}: {
  href: string;
  /** What this button is, for the analytics breakdown. Usually the visible text. */
  label: string;
  locale: Locale;
  /** b2b / b2c when the page is aimed at one of them. */
  segment?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <ButtonLink
      href={href}
      variant={variant}
      size={size}
      className={className}
      onClick={() => trackEvent("cta_click", { locale, segment, meta: { label, href } })}
    >
      {children}
    </ButtonLink>
  );
}
