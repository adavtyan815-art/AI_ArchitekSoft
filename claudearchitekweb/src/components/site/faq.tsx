import { cn } from "@/lib/utils";

/** FAQ as an indexed rule list: mono number, serif question, plain answer. */
export function Faq({ items, className }: { items: { q: string; a: string }[]; className?: string }) {
  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((it, i) => (
        <details key={it.q} className="group py-1">
          <summary className="flex cursor-pointer list-none items-start gap-4 py-4 [&::-webkit-details-marker]:hidden">
            <span className="index mt-1.5 w-7 flex-none">{String(i + 1).padStart(2, "0")}</span>
            <span className="flex-1 font-display text-[1.15rem] leading-snug text-fg sm:text-[1.3rem]">{it.q}</span>
            <span className="relative mt-1 h-5 w-5 flex-none text-muted transition-transform duration-200 group-open:rotate-45">
              <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
              <span className="absolute inset-y-0 left-1/2 w-px bg-current" />
            </span>
          </summary>
          <p className="pb-5 pl-11 pr-9 text-[15px] leading-relaxed text-fg-2">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
