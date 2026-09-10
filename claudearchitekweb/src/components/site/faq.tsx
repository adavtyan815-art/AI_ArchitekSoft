import { cn } from "@/lib/utils";

export function Faq({ items, className }: { items: { q: string; a: string }[]; className?: string }) {
  return (
    <div className={cn("card divide-y divide-line overflow-hidden", className)}>
      {items.map((it) => (
        <details key={it.q} className="group px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-fg [&::-webkit-details-marker]:hidden">
            {it.q}
            <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full border border-line text-muted transition-transform duration-200 group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 pr-8 text-[15px] leading-relaxed text-muted">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
