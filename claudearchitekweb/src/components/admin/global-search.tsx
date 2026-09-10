"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Hit = { type: string; typeLabel?: string; id: string; title: string; subtitle?: string; href: string };

export function GlobalSearch({ placeholder = "…" }: { placeholder?: string }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);

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
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={box} className="relative w-full max-w-md">
      <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
      <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => hits.length && setOpen(true)} placeholder={placeholder} className="input h-9 rounded-full pl-9 text-sm" />
      {open && hits.length ? (
        <div className="absolute top-11 left-0 z-30 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          {hits.map((h) => (
            <button
              key={`${h.type}-${h.id}`}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2"
              onClick={() => {
                setOpen(false);
                setQ("");
                router.push(h.href);
              }}
            >
              <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted">{h.typeLabel ?? h.type}</span>
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
