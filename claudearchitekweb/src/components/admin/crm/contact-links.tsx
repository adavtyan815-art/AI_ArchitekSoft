import { Mail, MessageCircle, Phone, Send } from "lucide-react";
import { getAdminDict } from "@/lib/i18n/admin";

/** A Telegram handle or t.me link that was typed into a phone field ("Phone or Telegram" on /contact). */
function telegramHandle(raw: string): string | null {
  const v = raw.trim();
  const fromLink = v.match(/^(?:https?:\/\/)?t\.me\/(@?[A-Za-z0-9_]{3,64})$/i);
  if (fromLink) return fromLink[1].replace(/^@/, "");
  const handle = v.match(/^@([A-Za-z0-9_]{3,64})$/);
  return handle ? handle[1] : null;
}

/**
 * WhatsApp needs a full international number. Armenian numbers are usually written locally
 * ("093 12 34 56"), and wa.me/093123456 is rejected: strip a 00 prefix and turn a single leading
 * 0 followed by 8 digits into the country code.
 */
function whatsappNumber(raw: string): string {
  let digits = raw.replace(/[^\d]/g, "");
  digits = digits.replace(/^00/, "");
  if (/^0\d{8}$/.test(digits)) digits = `374${digits.slice(1)}`;
  return digits;
}

/** Quick call / Telegram / WhatsApp / email links. Server component. */
export async function ContactLinks({ phone, telegram, whatsapp, email, size = "sm" }: { phone?: string | null; telegram?: string | null; whatsapp?: string | null; email?: string | null; size?: "sm" | "md" }) {
  const { t } = await getAdminDict();
  const L = t.crm.contact;
  // The public contact form has one "Phone or Telegram" field, so a handle can land in `phone`;
  // reading it as Telegram is the difference between one working link and none at all.
  const phoneAsHandle = phone ? telegramHandle(phone) : null;
  const tel = phoneAsHandle ? "" : phone?.replace(/[^\d+]/g, "");
  const wa = whatsappNumber(whatsapp || (phoneAsHandle ? "" : phone) || "");
  const tg = (telegram ? telegramHandle(telegram) ?? telegram.replace(/^https?:\/\/t\.me\//, "").replace(/^@/, "") : null) || phoneAsHandle;
  const cls = size === "sm" ? "btn-secondary btn-sm" : "btn-secondary";
  if (!tel && !wa && !tg && !email) return <span className="text-sm text-faint">{L.none}</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {tel ? (
        <a href={`tel:${tel}`} className={cls}>
          <Phone size={14} /> {L.call}
        </a>
      ) : null}
      {tg ? (
        <a href={`https://t.me/${tg}`} target="_blank" rel="noopener noreferrer" className={cls}>
          <Send size={14} /> {L.telegram}
        </a>
      ) : null}
      {wa ? (
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={cls}>
          <MessageCircle size={14} /> {L.whatsapp}
        </a>
      ) : null}
      {email ? (
        <a href={`mailto:${email}`} className={cls}>
          <Mail size={14} /> {L.email}
        </a>
      ) : null}
    </div>
  );
}
