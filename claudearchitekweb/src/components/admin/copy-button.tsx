"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Copies `text` to the clipboard and shows a short confirmation. */
export function CopyButton({ text, label = "Copy", className, iconOnly }: { text: string; label?: string; className?: string; iconOnly?: boolean }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  }
  return (
    <button type="button" onClick={copy} className={cn("btn-secondary btn-sm", className)} title={iconOnly ? label : undefined} aria-label={label}>
      {done ? <Check size={14} className="text-success-500" /> : <Copy size={14} />}
      {iconOnly ? null : done ? "Copied" : label}
    </button>
  );
}
