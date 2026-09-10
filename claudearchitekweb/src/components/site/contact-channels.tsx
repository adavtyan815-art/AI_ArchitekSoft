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

export function ContactChannels({ brand, dict, compact, className }: { brand: BrandSettings; dict: Dictionary; compact?: boolean; className?: string }) {
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
            <a href={i.href} className="inline-flex items-center gap-2 text-ink-700 hover:text-ink-950" target={i.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
              <i.icon size={14} className="text-ink-400" />
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
        <a key={i.label} href={i.href} className="card flex items-center gap-3 p-4 transition-colors hover:border-ink-300" target={i.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
          <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <i.icon size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-ink-500">{i.label}</span>
            <span className="block truncate text-sm font-medium text-ink-900">{i.value}</span>
          </span>
        </a>
      ))}
    </div>
  );
}
