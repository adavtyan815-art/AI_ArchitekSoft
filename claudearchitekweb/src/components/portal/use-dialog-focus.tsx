"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute("data-focus-sentinel") && el.getClientRects().length > 0);
}

/** Move focus to the first or the last control of a dialog (used by the sentinels below). */
export function focusEdge(root: HTMLElement | null, edge: "first" | "last") {
  if (!root) return;
  const items = focusables(root);
  const target = edge === "first" ? items[0] : items[items.length - 1];
  (target ?? root).focus({ preventScroll: true });
}

/**
 * Focus handling of a modal overlay:
 *  - on open, focus goes to `initial` (normally the close button);
 *  - on close, focus returns to `restoreTo()` or, without it, to whatever had focus before.
 * Tab wrapping is done by two <FocusSentinel> elements placed first and last inside the
 * dialog, which also works when the last control lives in a shadow tree (the 3D element).
 */
export function useDialogFocus(active: boolean, initial: RefObject<HTMLElement | null>, restoreTo?: () => HTMLElement | null) {
  useEffect(() => {
    if (!active) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    initial.current?.focus({ preventScroll: true });
    return () => {
      const target = restoreTo?.() ?? before;
      if (target && document.contains(target)) target.focus({ preventScroll: true });
    };
    // restoreTo is read on close only; a new function identity must not re-run the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, initial]);
}

/** Invisible tab stop: when it receives focus the dialog sends focus to its other end. */
export function FocusSentinel({ onFocus }: { onFocus: () => void }) {
  return <span tabIndex={0} data-focus-sentinel="" className="sr-only" onFocus={onFocus} />;
}
