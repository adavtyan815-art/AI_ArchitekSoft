"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Select } from "@/components/ui";

/**
 * A <select> for a form whose `action` is a server action.
 *
 * React 19 resets such a form once the action resolves, and an uncontrolled `<select
 * defaultValue>` then falls back to the option that was selected when it first mounted. On a
 * client or company page that meant the Status / Language / Source dropdowns kept showing the
 * values from before the save, so the next save wrote those stale values back over what the user
 * had just changed.
 *
 * Two things keep the control honest:
 *  - the value lives in state and is re-synced whenever the server sends a different one, so the
 *    control shows what was actually saved;
 *  - a native `reset()` does not re-render React, so the DOM would silently keep the reset value;
 *    the reset listener puts the state value back.
 */
export function FormSelect({ value, defaultValue, onChange, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const saved = String(value ?? defaultValue ?? "");
  const [current, setCurrent] = useState(saved);
  const fromServer = useRef(saved);
  const host = useRef<HTMLSpanElement>(null);
  const live = useRef(current);
  live.current = current;

  useEffect(() => {
    if (saved !== fromServer.current) {
      fromServer.current = saved;
      setCurrent(saved);
    }
  }, [saved]);

  useLayoutEffect(() => {
    const el = host.current?.querySelector("select");
    const form = el?.form;
    if (!el) return;
    if (el.value !== live.current) el.value = live.current;
    if (!form) return;
    const onReset = () => {
      // The browser restores the option marked as default; run after it to put ours back.
      queueMicrotask(() => {
        const node = host.current?.querySelector("select");
        if (node && node.value !== live.current) node.value = live.current;
      });
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  });

  return (
    <span ref={host} className="contents">
      <Select
        {...rest}
        value={current}
        onChange={(e) => {
          setCurrent(e.target.value);
          onChange?.(e);
        }}
      />
    </span>
  );
}
