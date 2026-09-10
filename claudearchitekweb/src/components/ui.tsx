/**
 * UI primitives (design system v2). Server-safe unless noted. Keep the API small and stable:
 * Button, ButtonLink, Card, CardBody, Badge, Field, Input, Textarea, Select, SectionHeading,
 * Stat, Empty, Kbd, CheckList, IconBox, Divider, Skeleton, Pill.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type BtnVariant = "primary" | "brand" | "secondary" | "ghost" | "soft" | "danger";
type BtnSize = "sm" | "md" | "lg";

const variantClass: Record<BtnVariant, string> = { primary: "btn-primary", brand: "btn-brand", secondary: "btn-secondary", ghost: "btn-ghost", soft: "btn-soft", danger: "btn-danger" };
const sizeClass: Record<BtnSize, string> = { sm: "btn-sm", md: "", lg: "btn-lg" };

export function Button({ variant = "primary", size = "md", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return <button className={cn(variantClass[variant], sizeClass[size], className)} {...props} />;
}

export function ButtonLink({ href, variant = "primary", size = "md", className, children, external, ...rest }: { href: string; variant?: BtnVariant; size?: BtnSize; className?: string; children: ReactNode; external?: boolean } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const cls = cn(variantClass[variant], sizeClass[size], className);
  const isExternal = external || href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:");
  if (isExternal) {
    return (
      <a href={href} className={cls} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

export function Card({ className, hover, children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div className={cn("card", hover && "card-hover", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-5 sm:p-6", className)}>{children}</div>;
}

const badgeTones: Record<string, string> = {
  neutral: "border-line bg-surface-2 text-fg-2",
  brand: "border-transparent bg-accent-soft text-accent-soft-fg",
  success: "border-transparent bg-success-soft text-success",
  warning: "border-transparent bg-warning-soft text-warning",
  danger: "border-transparent bg-danger-soft text-danger",
  dark: "border-transparent bg-inverse-bg text-inverse-fg",
};

export function Badge({ tone = "neutral", className, children }: { tone?: keyof typeof badgeTones; className?: string; children: ReactNode }) {
  return <span className={cn("badge", badgeTones[tone], className)}>{children}</span>;
}

export function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("pill", className)}>{children}</span>;
}

export function Field({ label, hint, required, children, className }: { label: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input min-h-[110px]", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select className={cn("input appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <svg aria-hidden viewBox="0 0 24 24" width="14" height="14" className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}

export function SectionHeading({ eyebrow, title, text, align = "left", className, size = "section" }: { eyebrow?: string; title: string; text?: string; align?: "left" | "center"; className?: string; size?: "section" | "display" }) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <div className="eyebrow mb-4">{eyebrow}</div> : null}
      <h2 className={size === "display" ? "h-display" : "h-section"}>{title}</h2>
      {text ? <p className="lead mt-5">{text}</p> : null}
    </div>
  );
}

export function Stat({ value, label, className }: { value: ReactNode; label: ReactNode; className?: string }) {
  return (
    <div className={cn("card p-5", className)}>
      <div className="font-display text-3xl font-bold tracking-tight text-fg">{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  );
}

export function Empty({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">{icon}</div> : null}
      <div className="h-card">{title}</div>
      {text ? <div className="mt-1.5 max-w-md text-sm text-muted">{text}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg-2">{children}</kbd>;
}

export function IconBox({ children, tone = "soft", size = "md", className }: { children: ReactNode; tone?: "soft" | "neutral" | "inverse"; size?: "sm" | "md" | "lg"; className?: string }) {
  const tones = { soft: "bg-accent-soft text-accent-soft-fg", neutral: "bg-surface-2 text-fg-2", inverse: "bg-inverse-bg text-inverse-fg" };
  const sizes = { sm: "h-8 w-8 rounded-lg [&>svg]:h-4 [&>svg]:w-4", md: "h-11 w-11 rounded-xl [&>svg]:h-5 [&>svg]:w-5", lg: "h-14 w-14 rounded-2xl [&>svg]:h-6 [&>svg]:w-6" };
  return <span className={cn("inline-flex flex-none items-center justify-center", tones[tone], sizes[size], className)}>{children}</span>;
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("hairline", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} />;
}

export function CheckList({ items, className, tone = "soft" }: { items: string[]; className?: string; tone?: "soft" | "inverse" }) {
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((it) => (
        <li key={it} className="flex items-start gap-3 text-[15px] leading-snug text-fg-2">
          <span className={cn("mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full", tone === "soft" ? "bg-accent-soft text-accent-soft-fg" : "bg-white/15 text-white")}>
            <Check size={12} strokeWidth={3} />
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
