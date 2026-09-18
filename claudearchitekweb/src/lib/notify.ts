/**
 * Owner notifications (Telegram first, email optional). All best-effort: every outbound call has a
 * timeout and failures are logged, never thrown to the caller.
 */
import { env } from "./env";
import { getSetting } from "./settings";
import { escapeHtml, sendMessage } from "./telegram";
import type { Lead, ClientFeedback, Project } from "./db/schema";

export async function notifyNewLead(lead: Lead) {
  const tg = getSetting("telegram");
  const chat = tg.adminChatId;
  const lines = [
    `🆕 <b>New ${lead.segment.toUpperCase()} request</b>`,
    `<b>${escapeHtml(lead.name)}</b>${lead.companyName ? ` — ${escapeHtml(lead.companyName)}` : ""}`,
    lead.phone ? `📞 ${escapeHtml(lead.phone)}` : "",
    lead.telegram ? `✈️ ${escapeHtml(lead.telegram)}` : "",
    lead.email ? `✉️ ${escapeHtml(lead.email)}` : "",
    lead.service ? `Service: ${escapeHtml(lead.service)}` : "",
    lead.roomType ? `Room: ${escapeHtml(lead.roomType)}` : "",
    lead.budget ? `Budget: ${escapeHtml(lead.budget)}` : "",
    lead.message ? `\n${escapeHtml(lead.message.slice(0, 500))}` : "",
    `\n${env.appUrl}/admin/leads/${lead.id}`,
  ].filter(Boolean);
  if (chat && tg.notifyNewLeads) {
    try {
      await sendMessage(chat, lines.join("\n"), { parseMode: "HTML" });
    } catch (e) {
      console.warn("[notify] telegram failed", (e as Error).message);
    }
  }
  await sendEmail(`New ${lead.segment.toUpperCase()} request: ${lead.name}`, lines.join("\n").replace(/<[^>]+>/g, ""));
}

export async function notifyClientFeedback(fb: ClientFeedback, project: Project) {
  const tg = getSetting("telegram");
  const chat = tg.adminChatId;
  const icon = fb.type === "approve" ? "✅" : fb.type === "change_request" ? "✏️" : "❓";
  const text = [
    `${icon} <b>Client ${fb.type.replace("_", " ")}</b> — ${escapeHtml(project.code)} ${escapeHtml(project.title)}`,
    fb.message ? escapeHtml(fb.message.slice(0, 800)) : "",
    fb.contact ? `Contact: ${escapeHtml(fb.contact)}` : "",
    `\n${env.appUrl}/admin/projects/${project.id}`,
  ]
    .filter(Boolean)
    .join("\n");
  if (chat && tg.notifyClientFeedback) {
    try {
      await sendMessage(chat, text, { parseMode: "HTML" });
    } catch (e) {
      console.warn("[notify] telegram failed", (e as Error).message);
    }
  }
}

export async function notifyText(text: string) {
  const chat = getSetting("telegram").adminChatId;
  if (!chat) return;
  try {
    await sendMessage(chat, text, { parseMode: "HTML" });
  } catch (e) {
    console.warn("[notify] telegram failed", (e as Error).message);
  }
}

export async function sendEmail(subject: string, text: string) {
  if (!env.email.resendKey) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.email.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.email.from, to: [env.email.to], subject, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.warn("[notify] email failed", res.status, (await res.text().catch(() => "")).slice(0, 300));
  } catch (e) {
    const name = (e as { name?: string }).name;
    console.warn("[notify] email failed", name === "TimeoutError" || name === "AbortError" ? "timed out after 10 s" : (e as Error).message);
  }
}
