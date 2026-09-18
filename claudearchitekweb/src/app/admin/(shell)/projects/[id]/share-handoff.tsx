"use client";

import { useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { CopyButton } from "@/components/admin/copy-button";
import { markShareSentAction } from "@/app/admin/actions/project-actions";

/**
 * The two ways a client page is handed over by hand: the clipboard and WhatsApp.
 * Both record "sent" (`markShareSentAction`), so /admin/pages and the project stop reading "Sent: —"
 * for a link the client already has. The WhatsApp anchor keeps its normal navigation: the action runs
 * in a transition next to it and never delays the jump to wa.me.
 */
export function ShareHandoff({
  linkId,
  url,
  waUrl,
  copyLabel,
  copiedLabel,
  whatsappLabel,
}: {
  linkId: string;
  url: string;
  waUrl: string;
  copyLabel: string;
  copiedLabel: string;
  whatsappLabel: string;
}) {
  const [, startTransition] = useTransition();

  const markSent = (via: "copy" | "whatsapp") => {
    const data = new FormData();
    data.set("id", linkId);
    data.set("via", via);
    startTransition(() => {
      void markShareSentAction(data);
    });
  };

  return (
    <>
      <CopyButton text={url} label={copyLabel} copiedLabel={copiedLabel} onCopied={() => markSent("copy")} />
      <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm" onClick={() => markSent("whatsapp")}>
        <MessageCircle size={14} /> {whatsappLabel}
      </a>
    </>
  );
}
