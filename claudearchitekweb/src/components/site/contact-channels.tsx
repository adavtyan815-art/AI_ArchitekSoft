import { Mail, MessageCircle, Phone, Send } from "lucide-react";
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

export function ContactChannels({ brand, dict, compact, className }: { brand: BrandSettings; dict: { common: ChannelLabels }; compact?: boolean; className?: string }) {
  const items = [
    { icon: Send, label: dict.common.telegram, value: brand.telegram, href: telegramUrl(brand.telegram) },
    { icon: MessageCircle, label: dict.common.whatsapp, value: brand.whatsapp, href: whatsappUrl(brand.whatsapp) },
    { icon: Phone, label: dict.common.call, value: brand.phone, href: `tel:${brand.phone.replace(/[^\d+]/g, "")}` },
    { icon: Mail, label: dict.common.email, value: brand.email, href: `mailto:${brand.email}` },
  ].filter((i) => i.value);
  if (compact) {
    return (
      <ul className={cn("space-y-2 text-sm", className)}>
        {items.map((i) => (
          <li key={i.label}>
            <a href={i.href} className="inline-flex items-center gap-2 text-fg-2 transition-colors hover:text-fg" target={i.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
              <i.icon size={14} className="text-faint" />
              {i.value}
            </a>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {items.map((i) => (
        <a key={i.label} href={i.href} className="card card-hover flex min-h-[62px] items-center gap-3 p-4" target={i.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
          <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accent-soft text-accent-soft-fg">
            <i.icon size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold tracking-wide text-muted uppercase">{i.label}</span>
            <span className="block truncate text-sm font-medium text-fg">{i.value}</span>
          </span>
        </a>
      ))}
    </div>
  );
}
