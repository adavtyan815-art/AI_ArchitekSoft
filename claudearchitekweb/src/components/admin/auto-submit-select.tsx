"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Select } from "@/components/ui";
import { cn } from "@/lib/utils";

const KEYBOARD_PICK = new Set(["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]);

/**
 * A <select> that saves as soon as the value is picked with the pointer.
 *
 * Two things a plain `onChange -> form.requestSubmit()` gets wrong:
 *  - On Windows, arrowing a *closed* select fires `change` for every option in between, so a
 *    keyboard user saves (and logs) every intermediate status and can never reach the later
 *    options. A change that came from the keyboard therefore waits for Enter or for the field to
 *    lose focus, which is when the user has actually settled on a value.
 *  - After the action resolves React resets the form, and an uncontrolled select falls back to
 *    the option selected when it first mounted — showing the old stage after a save. The value is
 *    kept in state, re-synced whenever the server sends a different one, and re-applied after a
 *    native reset (which does not re-render React).
 */
export function AutoSubmitSelect({ value, defaultValue, className, onChange, onKeyDown, onBlur, onPointerDown, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  // Call sites may pass either; both are treated as "what the server says the value is now".
  const saved = String(value ?? defaultValue ?? "");
  const [current, setCurrent] = useState(saved);
  const [dirty, setDirty] = useState(false);
  const fromKeyboard = useRef(false);
  const fromServer = useRef(saved);
  const host = useRef<HTMLSpanElement>(null);
  const live = useRef(current);
  live.current = current;

  useEffect(() => {
    if (saved !== fromServer.current) {
      fromServer.current = saved;
      setCurrent(saved);
      setDirty(false);
    }
  }, [saved]);

  useLayoutEffect(() => {
    const el = host.current?.querySelector("select");
    const form = el?.form;
    if (!el) return;
    if (el.value !== live.current) el.value = live.current;
    if (!form) return;
    const onReset = () => {
      queueMicrotask(() => {
        const node = host.current?.querySelector("select");
        if (node && node.value !== live.current) node.value = live.current;
      });
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  });

  function submit(el: HTMLSelectElement) {
    setDirty(false);
    el.form?.requestSubmit();
  }

  return (
    <span ref={host} className="contents">
      <Select
        {...rest}
        value={current}
        className={cn(className, dirty && "border-accent")}
        onPointerDown={(e) => {
          fromKeyboard.current = false;
          onPointerDown?.(e);
        }}
        onKeyDown={(e) => {
          if (KEYBOARD_PICK.has(e.key) || e.key.length === 1) fromKeyboard.current = true;
          if (e.key === "Enter" && dirty) {
            e.preventDefault();
            submit(e.currentTarget);
          }
          onKeyDown?.(e);
        }}
        onChange={(e) => {
          setCurrent(e.target.value);
          onChange?.(e);
          if (fromKeyboard.current) setDirty(true);
          else submit(e.currentTarget);
        }}
        onBlur={(e) => {
          if (dirty) submit(e.currentTarget);
          onBlur?.(e);
        }}
      />
    </span>
  );
}
