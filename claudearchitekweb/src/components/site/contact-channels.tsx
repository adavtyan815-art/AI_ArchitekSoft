import { ArrowUpRight } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import type { BrandSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export function telegramUrl(handle: string) {
  return `https://t.me/${handle.replace(/^@/, "")}`;
}
export function whatsappUrl(number: string) {
  return `https://wa.me/${number.replace(/[^\d]/g, "")}`;
}

type ChannelLabels = Pick<Dictionary["common"], "telegram" | "whatsapp" | "call" | "email">;

/**
 * Contact channels as a spec list (mono label · value · arrow), not icon cards.
 * `compact` = a plain list for footers and sidebars.
 */
export function ContactChannels({ brand, dict, compact, className }: { brand: BrandSettings; dict: { common: ChannelLabels }; compact?: boolean; className?: string }) {
  const items = [
    { label: dict.common.telegram, value: brand.telegram, href: telegramUrl(brand.telegram) },
    { label: dict.common.whatsapp, value: brand.whatsapp, href: whatsappUrl(brand.whatsapp) },
    { label: dict.common.call, value: brand.phone, href: `tel:${brand.phone.replace(/[^\d+]/g, "")}` },
    { label: dict.common.email, value: brand.email, href: `mailto:${brand.email}` },
  ].filter((i) => i.value);
  const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});
  if (compact) {
    // Compact rows are still telephone numbers and chat handles — the things a visitor taps on a
    // phone. The padding goes on the anchor, as in the full list below; from sm the rhythm returns.
    return (
      <ul className={cn("space-y-0 text-[14px] sm:space-y-1.5", className)}>
        {items.map((i) => (
          <li key={i.label} className="contain-w flex items-center gap-3 sm:items-baseline">
            <span className="caption w-20 flex-none">{i.label}</span>
            <a href={i.href} className="flex min-h-10 min-w-0 flex-1 items-center text-fg-2 transition-colors hover:text-fg sm:block sm:min-h-0" {...ext(i.href)}>
              {i.value}
            </a>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((i) => (
        <li key={i.label}>
          <a href={i.href} className="contain-w group flex items-center justify-between gap-4 py-3.5 transition-colors hover:text-accent" {...ext(i.href)}>
            <span className="flex min-w-0 items-baseline gap-4">
              <span className="caption w-24 flex-none">{i.label}</span>
              <span className="min-w-0 truncate text-[16px] font-medium text-fg group-hover:text-accent">{i.value}</span>
            </span>
            <ArrowUpRight size={16} className="flex-none text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
          </a>
        </li>
      ))}
    </ul>
  );
}
