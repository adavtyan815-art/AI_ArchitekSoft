"use client";

import { Box, MessageSquare, ThumbsUp } from "lucide-react";
import { ViewerLink } from "./viewer-link";

export type StickyActionsProps = {
  slug: string;
  token: string;
  /** /v/<slug>?k=… or the project's external viewer link. Hidden when null. */
  webViewerHref?: string | null;
  /** Anchor id of the decision block, e.g. "feedback". Hidden when null. */
  feedbackId?: string | null;
  /** "approve" while the project waits for a decision, "message" once it has moved on. */
  mode?: "approve" | "message";
  labels: {
    /** Full sentence, used as the accessible name. */
    viewer: string;
    /** Two words that fit the phone bar next to the second button. */
    viewerShort: string;
    approve: string;
    approveShort: string;
    message: string;
    messageShort: string;
  };
};

/**
 * Phone-first bottom bar: the two things a client actually does on this page.
 * Hidden from lg upwards, where the same actions sit inline in the page.
 * The labels are the short forms: the Armenian sentence "Բացել Web Viewer-ը" does not
 * fit a 203 px button and was clipped, so the bar carries "Web Viewer" and keeps the
 * full sentence as the accessible name.
 */
export function StickyActions({ slug, token, webViewerHref, feedbackId, mode = "approve", labels }: StickyActionsProps) {
  if (!webViewerHref && !feedbackId) return null;
  const secondLabel = mode === "approve" ? labels.approve : labels.message;
  const secondShort = mode === "approve" ? labels.approveShort : labels.messageShort;

  return (
    <div className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line px-4 pt-3 lg:hidden">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2.5">
        {webViewerHref ? (
          <ViewerLink slug={slug} token={token} href={webViewerHref} ariaLabel={labels.viewer} className="btn-brand min-h-[52px] min-w-0 flex-1 px-4 text-[15px]">
            <Box size={18} className="flex-none" aria-hidden />
            <span className="truncate">{labels.viewerShort}</span>
          </ViewerLink>
        ) : null}
        {feedbackId ? (
          <button
            type="button"
            aria-label={secondLabel}
            onClick={() => document.getElementById(feedbackId)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className={`btn-secondary min-h-[52px] min-w-0 px-4 text-[15px] ${webViewerHref ? "max-w-[45%] shrink" : "flex-1"}`}
          >
            {mode === "approve" ? <ThumbsUp size={18} className="flex-none" aria-hidden /> : <MessageSquare size={18} className="flex-none" aria-hidden />}
            <span className="truncate">{secondShort}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
