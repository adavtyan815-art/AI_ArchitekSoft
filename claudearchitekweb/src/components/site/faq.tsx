import { cn } from "@/lib/utils";

export function Faq({ items, className }: { items: { q: string; a: string }[]; className?: string }) {
  return (
    <div className={cn("divide-y divide-line rounded-2xl border border-line bg-white", className)}>
      {items.map((it) => (
        <details key={it.q} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-ink-900 [&::-webkit-details-marker]:hidden">
            {it.q}
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-line text-ink-500 transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-ink-600">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
