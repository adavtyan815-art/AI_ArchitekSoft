"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Kbd } from "@/components/ui";
import { cn } from "@/lib/utils";

type Hit = { type: string; typeLabel?: string; id: string; title: string; subtitle?: string; href: string };

export type SearchLabels = {
  /** Placeholder, also used as the accessible name of the field. */
  placeholder: string;
  /** Shown while a request is in flight. */
  loading: string;
  /** Shown when the query matched nothing. */
  noResults: string;
  /** Result-count announcement, containing `{n}`. */
  results: string;
  /** Accessible name of the phone search button. */
  open: string;
  /** Accessible name of the close button. */
  close: string;
};

export function GlobalSearch({ labels, autoFocus, hotkey = true, onDone }: { labels: SearchLabels; autoFocus?: boolean; hotkey?: boolean; onDone?: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mac, setMac] = useState(false);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const listId = useId();
  /** An arrow press that has to wait for the list to be rendered before it can move into it. */
  const pendingMove = useRef<0 | 1 | -1>(0);
  const showList = open && q.trim().length >= 2;

  const move = useCallback((dir: 1 | -1) => {
    const items = Array.from(list.current?.querySelectorAll<HTMLButtonElement>("button[data-hit]") ?? []);
    if (!items.length) return;
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = at < 0 ? (dir === 1 ? 0 : items.length - 1) : (at + dir + items.length) % items.length;
    items[next].focus();
  }, []);

  /**
   * Arrowing into a list that is closed (after Escape, or after clicking away) has to happen in two
   * steps: the key handler only asks for the list, and the focus moves once React has rendered it.
   * Doing both in the handler moved focus against the collapsed DOM, so the first ArrowDown did
   * nothing visible and the user had to press it twice before Enter opened anything.
   */
  useEffect(() => {
    if (!showList || !pendingMove.current) return;
    const dir = pendingMove.current;
    pendingMove.current = 0;
    move(dir);
  }, [showList, move]);

  useEffect(() => {
    // Rendered the same on the server and on the first client render, then corrected — the
    // shortcut really is Ctrl+K everywhere except macOS, where the hint used to lie.
    setMac(/mac|iphone|ipad|ipod/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    // A new query invalidates an arrow press that is still waiting for the old list.
    pendingMove.current = 0;
    if (q.trim().length < 2) {
      setHits([]);
      setOpen(false);
      setBusy(false);
      return;
    }
    const ctrl = new AbortController();
    setBusy(true);
    const t = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { hits: Hit[] }) => {
          setHits(d.hits ?? []);
          setOpen(true);
          setBusy(false);
        })
        .catch(() => {
          // An aborted request is replaced by the next one; anything else leaves the field usable.
          if (!ctrl.signal.aborted) setBusy(false);
        });
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        field.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hotkey]);

  useEffect(() => {
    if (autoFocus) field.current?.focus();
  }, [autoFocus]);

  const status = busy ? labels.loading : hits.length ? labels.results.replace("{n}", String(hits.length)) : labels.noResults;

  function go(href: string) {
    setOpen(false);
    setQ("");
    onDone?.();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (showList) {
        setOpen(false);
        field.current?.focus();
      } else {
        onDone?.();
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      if (showList) {
        move(dir);
      } else if (hits.length) {
        pendingMove.current = dir;
        setOpen(true);
      }
    }
  }

  return (
    <div ref={box} onKeyDown={onKeyDown} className="relative w-full max-w-md">
      <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
      <input
        ref={field}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        // Focus arriving from inside the widget is the Escape handler putting the caret back; re-opening
        // the list there would undo the close the user just asked for.
        onFocus={(e) => {
          if (box.current?.contains(e.relatedTarget)) return;
          if (hits.length) setOpen(true);
        }}
        placeholder={labels.placeholder}
        aria-label={labels.placeholder}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        className="input h-11 pr-14 pl-9 text-[13.5px] sm:h-9"
      />
      <span className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 md:block">
        <Kbd>{mac ? "⌘K" : "Ctrl K"}</Kbd>
      </span>
      {/* Announce what the dropdown shows: a silent list is indistinguishable from "still loading". */}
      <span aria-live="polite" className="sr-only">
        {showList ? status : ""}
      </span>
      {showList ? (
        <div ref={list} id={listId} className="absolute top-12 left-0 z-30 w-full overflow-hidden rounded-md border border-line bg-surface shadow-lift sm:top-11">
          {hits.length === 0 ? (
            <div className="grid-paper px-3 py-3 font-mono text-[11.5px] tracking-[0.06em] text-muted uppercase">{busy ? labels.loading : labels.noResults}</div>
          ) : (
            hits.map((h) => (
              <button
                key={`${h.type}-${h.id}`}
                type="button"
                data-hit
                className="flex min-h-11 w-full items-center gap-3 border-b border-line px-3 py-2 text-left text-[13.5px] transition-colors last:border-0 hover:bg-surface-2 focus-visible:bg-surface-2"
                onClick={() => go(h.href)}
              >
                <span className="tag flex-none">{h.typeLabel ?? h.type}</span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-fg">{h.title}</span>
                  {h.subtitle ? <span className="ml-2 text-muted">{h.subtitle}</span> : null}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Phone entry point: the desktop field is `hidden sm:block`, so without this there is no way to
 * search leads, clients or projects at all on a phone. Opens the same field as a sheet under the
 * topbar; Escape and the close button dismiss it and focus returns to the button.
 */
export function MobileSearch({ labels }: { labels: SearchLabels }) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  return (
    <div className="sm:hidden">
      <button ref={opener} type="button" onClick={() => setOpen((v) => !v)} aria-label={labels.open} aria-expanded={open} className={cn("btn-ghost btn-icon", open && "text-accent")}>
        {open ? <X size={16} /> : <Search size={16} />}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-16 z-30 border-b border-line bg-surface px-4 py-3 shadow-lift">
          <GlobalSearch
            labels={labels}
            autoFocus
            hotkey={false}
            onDone={() => {
              setOpen(false);
              opener.current?.focus();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
