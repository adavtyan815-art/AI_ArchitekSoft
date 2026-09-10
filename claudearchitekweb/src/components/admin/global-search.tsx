"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Kbd } from "@/components/ui";

type Hit = { type: string; typeLabel?: string; id: string; title: string; subtitle?: string; href: string };

export function GlobalSearch({ placeholder = "…" }: { placeholder?: string }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { hits: Hit[] }) => {
          setHits(d.hits ?? []);
          setOpen(true);
        })
        .catch(() => {});
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
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        field.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={box} className="relative w-full max-w-md">
      <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
      <input ref={field} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => hits.length && setOpen(true)} placeholder={placeholder} className="input h-9 pr-14 pl-9 text-[13.5px]" />
      <span className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 md:block">
        <Kbd>⌘K</Kbd>
      </span>
      {open && hits.length ? (
        <div className="absolute top-11 left-0 z-30 w-full overflow-hidden rounded-md border border-line bg-surface shadow-lift">
          {hits.map((h) => (
            <button
              key={`${h.type}-${h.id}`}
              className="flex w-full items-center gap-3 border-b border-line px-3 py-2 text-left text-[13.5px] transition-colors last:border-0 hover:bg-surface-2"
              onClick={() => {
                setOpen(false);
                setQ("");
                router.push(h.href);
              }}
            >
              <span className="tag flex-none">{h.typeLabel ?? h.type}</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium text-fg">{h.title}</span>
                {h.subtitle ? <span className="ml-2 text-muted">{h.subtitle}</span> : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
