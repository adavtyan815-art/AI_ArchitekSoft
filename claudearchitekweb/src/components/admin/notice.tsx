import { cn } from "@/lib/utils";

/** Simple toast substitute: pages render `?notice=...&tone=ok|error` from the URL after server actions redirect. */
export function Notice({ text, tone, className }: { text?: string | string[] | null; tone?: string | string[] | null; className?: string }) {
  const t = Array.isArray(text) ? text[0] : text;
  if (!t) return null;
  const tn = Array.isArray(tone) ? tone[0] : tone;
  const isError = tn === "error" || /^error/i.test(t);
  return (
    <div role="status" className={cn("mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", isError ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800", className)}>
      <span className="mt-0.5 inline-block h-2 w-2 flex-none rounded-full bg-current" />
      <span className="break-words">{t}</span>
    </div>
  );
}

export function noticeFrom(sp: Record<string, string | string[] | undefined>) {
  return { text: sp.notice, tone: sp.tone };
}
