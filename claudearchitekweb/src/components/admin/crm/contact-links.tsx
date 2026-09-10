import { Mail, MessageCircle, Phone, Send } from "lucide-react";
import { getAdminDict } from "@/lib/i18n/admin";

/** Quick call / Telegram / WhatsApp / email links. Server component. */
export async function ContactLinks({ phone, telegram, whatsapp, email, size = "sm" }: { phone?: string | null; telegram?: string | null; whatsapp?: string | null; email?: string | null; size?: "sm" | "md" }) {
  const { t } = await getAdminDict();
  const L = t.crm.contact;
  const tel = phone?.replace(/[^\d+]/g, "");
  const wa = (whatsapp || phone)?.replace(/[^\d]/g, "");
  const tg = telegram?.replace(/^https?:\/\/t\.me\//, "").replace(/^@/, "");
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
