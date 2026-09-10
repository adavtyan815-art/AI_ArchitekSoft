/**
 * UI primitives — design system v3 "Atelier" (docs/14_DESIGN_SYSTEM.md).
 * Server-safe. Keep the API small and stable:
 * Button, ButtonLink, Card, CardBody, Badge, Pill, Tag, Field, Input, Textarea, Select,
 * SectionHeading, Index, Rule, Ticks, Frame, Spec, Stat, Empty, Kbd, CheckList, IconBox, Divider, Skeleton, Swatch.
 */
import Link from "next/link";
import type { ReactNode } from "react";
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

/** Mono uppercase chip for categories, codes and technical tags. */
export function Tag({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("tag", className)}>{children}</span>;
}

export function Field({ label, hint, required, children, className }: { label: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">
        {label}
        {required ? <span className="text-accent"> *</span> : null}
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
  return <textarea className={cn("input min-h-[120px]", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select className={cn("input appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <svg aria-hidden viewBox="0 0 24 24" width="14" height="14" className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}

/** Mono index like "01". Pass a number or a string. */
export function Index({ n, className }: { n: number | string; className?: string }) {
  const s = typeof n === "number" ? String(n).padStart(2, "0") : n;
  return <span className={cn("index", className)}>{s}</span>;
}

/**
 * Section opener: hairline rule, mono index + eyebrow on the left, serif title and lead.
 * `display` renders an H1 (page heroes); `action` is placed on the right on desktop.
 */
export function SectionHeading({
  index,
  eyebrow,
  title,
  text,
  action,
  align = "left",
  className,
  size = "section",
  rule = true,
}: {
  index?: number | string;
  eyebrow?: string;
  title: string;
  text?: string;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
  size?: "section" | "display";
  rule?: boolean;
}) {
  const Heading = size === "display" ? "h1" : "h2";
  return (
    <div className={cn(rule && align === "left" && "border-t border-line pt-6 sm:pt-8", className)}>
      <div className={cn("flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between", align === "center" && "items-center text-center lg:flex-col lg:items-center")}>
        <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
          {index !== undefined || eyebrow ? (
            <div className={cn("mb-4 flex items-center gap-3", align === "center" && "justify-center")}>
              {index !== undefined ? <Index n={index} /> : null}
              {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
            </div>
          ) : null}
          <Heading className={size === "display" ? "h-display" : "h-section"}>{title}</Heading>
          {text ? <p className="lead mt-5 max-w-xl">{text}</p> : null}
        </div>
        {action ? <div className="flex-none">{action}</div> : null}
      </div>
    </div>
  );
}

export function Rule({ className }: { className?: string }) {
  return <hr className={cn("rule", className)} />;
}

/** Ruler line with tick marks — a structural divider used under heroes and stat rows. */
export function Ticks({ className }: { className?: string }) {
  return <div aria-hidden className={cn("ticks w-full", className)} />;
}

/**
 * Media frame: hairline, small radius, optional corner marks and a mono caption bar.
 * Children should be an absolutely positioned or block image/video; pass `aspect` for the box.
 */
export function Frame({ children, caption, marks, aspect, className, captionRight }: { children: ReactNode; caption?: ReactNode; captionRight?: ReactNode; marks?: boolean; aspect?: string; className?: string }) {
  return (
    <figure className={cn("frame", className)}>
      <div className={cn("relative", aspect, marks && "frame-marks on-image")}>{children}</div>
      {caption || captionRight ? (
        <figcaption className="flex items-center justify-between gap-4 border-t border-line px-3.5 py-2">
          <span className="caption min-w-0 flex-1 truncate">{caption}</span>
          {captionRight ? <span className="caption min-w-0 max-w-[55%] flex-none truncate">{captionRight}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Key/value spec list with mono keys. */
export function Spec({ rows, className }: { rows: { k: string; v: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("spec", className)}>
      {rows.map((r) => (
        <div key={r.k}>
          <dt>{r.k}</dt>
          <dd>{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Stat({ value, label, className, hint }: { value: ReactNode; label: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn("border-t border-line-strong pt-3", className)}>
      <div className="font-display text-[2.2rem] leading-none font-medium tracking-tight text-fg tabular-nums sm:text-[2.6rem]">{value}</div>
      <div className="mt-2 text-[13.5px] leading-snug text-muted">{label}</div>
      {hint ? <div className="caption mt-1">{hint}</div> : null}
    </div>
  );
}

export function Empty({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card grid-paper flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon ? <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-line bg-surface text-muted">{icon}</div> : null}
      <div className="h-card">{title}</div>
      {text ? <div className="mt-2 max-w-md text-sm text-muted">{text}</div> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-sm border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg-2">{children}</kbd>;
}

export function IconBox({ children, tone = "soft", size = "md", className }: { children: ReactNode; tone?: "soft" | "neutral" | "inverse" | "line"; size?: "sm" | "md" | "lg"; className?: string }) {
  const tones = { soft: "bg-accent-soft text-accent-soft-fg", neutral: "bg-surface-2 text-fg", inverse: "bg-inverse-bg text-inverse-fg", line: "border border-line-strong text-fg" };
  const sizes = { sm: "h-8 w-8 rounded-sm [&>svg]:h-4 [&>svg]:w-4", md: "h-10 w-10 rounded-md [&>svg]:h-[18px] [&>svg]:w-[18px]", lg: "h-12 w-12 rounded-md [&>svg]:h-5 [&>svg]:w-5" };
  return <span className={cn("inline-flex flex-none items-center justify-center", tones[tone], sizes[size], className)}>{children}</span>;
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("rule", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} />;
}

/** List with en-dash markers (or mono indices with `numbered`). */
export function CheckList({ items, className, numbered, tone }: { items: string[]; className?: string; numbered?: boolean; tone?: "soft" | "inverse" }) {
  void tone;
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((it, i) => (
        <li key={it} className="flex items-start gap-3 text-[15px] leading-snug text-fg-2">
          {numbered ? <Index n={i + 1} className="mt-[3px] w-6 flex-none" /> : <span aria-hidden className="mt-[11px] h-px w-4 flex-none bg-accent" />}
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** Material chip: a colour or an image fill, with an optional mono label below. */
export function Swatch({ hex, image, label, active, className, ...rest }: { hex?: string; image?: string; label?: string; active?: boolean; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-pressed={active} className={cn("group flex flex-col items-center gap-1.5", className)} {...rest}>
      <span className="swatch overflow-hidden" style={{ background: image ? `url(${image}) center/cover` : hex }} />
      {label ? <span className={cn("font-mono text-[10px] uppercase tracking-[0.08em]", active ? "text-fg" : "text-muted")}>{label}</span> : null}
    </button>
  );
}
