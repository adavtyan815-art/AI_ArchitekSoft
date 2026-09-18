import { cn } from "@/lib/utils";
import { NoticeUrlCleanup } from "./notice-cleanup";

/** Simple toast substitute: pages render `?notice=...&tone=ok|error` from the URL after server actions redirect. */
export function Notice({ text, tone, className }: { text?: string | string[] | null; tone?: string | string[] | null; className?: string }) {
  const t = Array.isArray(text) ? text[0] : text;
  if (!t) return null;
  const tn = Array.isArray(tone) ? tone[0] : tone;
  const isError = tn === "error" || /^error/i.test(t);
  return (
    <div role="status" className={cn("mb-5 flex items-start gap-3 rounded-sm border px-4 py-2.5 text-[13.5px]", isError ? "border-danger/30 bg-danger-soft text-danger" : "border-success/30 bg-success-soft text-success", className)}>
      <span className="mt-2 inline-block h-1.5 w-1.5 flex-none bg-current" />
      <span className="break-words">{t}</span>
      {/* The message lives in the query string, so a plain reload would show the same
          "Passwords do not match." again. Drop it from the URL once it has been rendered. */}
      <NoticeUrlCleanup />
    </div>
  );
}

export function noticeFrom(sp: Record<string, string | string[] | undefined>) {
  return { text: sp.notice, tone: sp.tone };
}
