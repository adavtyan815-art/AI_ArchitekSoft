"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  label?: string;
  copiedLabel?: string;
  /** Replaces the default `btn-secondary btn-sm` look (pass the full button classes). */
  className?: string;
  iconOnly?: boolean;
  /** Called after the text reached the clipboard (e.g. to record that a link was handed over). */
  onCopied?: () => void;
};

/**
 * Copies `text` to the clipboard and shows a short confirmation. Labels come from the caller (localised).
 * The confirmation is also announced through a visually hidden polite live region, so screen-reader
 * users hear "Copied" even when the button shows only an icon.
 */
export function CopyButton({ text, label = "Copy", copiedLabel = "Copied", className, iconOnly, onCopied }: Props) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  async function copy() {
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API is unavailable on plain http / older browsers: fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
    }
    if (!ok) return;
    setDone(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1600);
    onCopied?.();
  }

  return (
    <>
      {/* The static aria-label is only needed when there is no visible text. */}
      <button type="button" onClick={copy} className={cn(className ?? "btn-secondary btn-sm")} title={iconOnly ? label : undefined} aria-label={iconOnly ? label : undefined}>
        {done ? <Check size={14} className="text-success" aria-hidden /> : <Copy size={14} aria-hidden />}
        {iconOnly ? null : done ? copiedLabel : label}
      </button>
      <span className="sr-only" aria-live="polite">
        {done ? copiedLabel : ""}
      </span>
    </>
  );
}
