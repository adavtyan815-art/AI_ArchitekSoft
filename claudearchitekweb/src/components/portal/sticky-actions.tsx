"use client";

import { Box, ThumbsUp } from "lucide-react";
import { portalEvent } from "./beacon";

export type StickyActionsProps = {
  slug: string;
  token: string;
  /** /v/<slug>?k=… or the project's external viewer link. Hidden when null. */
  webViewerHref?: string | null;
  /** Anchor id of the decision block, e.g. "feedback". Hidden when null. */
  feedbackId?: string | null;
  labels: { viewer: string; approve: string; approveShort: string };
};

/**
 * Phone-first bottom bar: the two things a client actually does on this page.
 * Hidden from lg upwards, where the same actions sit inline in the page.
 */
export function StickyActions({ slug, token, webViewerHref, feedbackId, labels }: StickyActionsProps) {
  if (!webViewerHref && !feedbackId) return null;
  const external = !!webViewerHref && /^https?:\/\//.test(webViewerHref);

  return (
    <div className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line px-4 pt-3 lg:hidden">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2.5">
        {webViewerHref ? (
          <a
            href={webViewerHref}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            onClick={() => portalEvent(slug, token, "open_viewer")}
            className="btn-brand min-h-[52px] min-w-0 flex-1 px-4 text-[15px]"
          >
            <Box size={18} aria-hidden />
            <span className="truncate">{labels.viewer}</span>
          </a>
        ) : null}
        {feedbackId ? (
          <button
            type="button"
            aria-label={labels.approve}
            onClick={() => document.getElementById(feedbackId)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className={`btn-secondary min-h-[52px] min-w-0 px-4 text-[15px] ${webViewerHref ? "max-w-[45%] shrink" : "flex-1"}`}
          >
            <ThumbsUp size={18} aria-hidden />
            <span className="truncate">{labels.approveShort}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
