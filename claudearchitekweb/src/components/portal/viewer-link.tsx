"use client";

import type { ReactNode } from "react";
import { portalEvent } from "./beacon";

export function isExternalHref(href: string | null | undefined): boolean {
  return !!href && /^https?:\/\//.test(href);
}

/**
 * Link to the Web Viewer. Our own /v route records the opening itself (it also sees
 * direct opens of a shared viewer link), so the click is reported from here only
 * for an externally hosted viewer, which has no such page. One open, one event.
 */
export function ViewerLink({ slug, token, href, className, children, ariaLabel }: { slug: string; token: string; href: string; className?: string; children: ReactNode; ariaLabel?: string }) {
  const external = isExternalHref(href);
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={external ? () => portalEvent(slug, token, "open_viewer", { via: "external" }) : undefined}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}
