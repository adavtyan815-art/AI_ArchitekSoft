import type { Metadata } from "next";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { getSetting } from "@/lib/settings";
import { Index, Ticks } from "@/components/ui";

type PrivacyText = { title: string; updated: string; intro: string; sections: { h: string; p: string }[]; contact: string };

const TEXT: Record<Locale, PrivacyText> = {
  hy: {
    title: "Գաղտնիության քաղաքականություն",
    updated: "Թարմացվել է՝ 2026 թ. սեպտեմբեր",
    intro: "ArchiTek Soft-ը հարգում է Ձեր գաղտնիությունը։ Այս էջը բացատրում է, թե ինչ տվյալներ ենք հավաքում կայքի և KitchenPro ծառայության միջոցով և ինչպես ենք դրանք օգտագործում։",
    sections: [
      { h: "Ինչ տվյալներ ենք հավաքում", p: "Հարցում ուղարկելիս՝ անուն, հեռախոս, Telegram, էլ. փոստ, ընկերության անվանում և նախագծի նկարագրություն, ինչպես նաև Ձեր կցած ֆայլերը (չափեր, էսքիզներ, լուսանկարներ)։" },
      { h: "Ինչպես ենք օգտագործում", p: "Միայն Ձեզ հետ կապվելու, նախագիծը պատրաստելու և 3D հղումը տրամադրելու համար։ Տվյալները չենք վաճառում և չենք փոխանցում երրորդ անձանց, բացի արտադրության համար անհրաժեշտ գործընկերներից՝ Ձեր համաձայնությամբ։" },
      { h: "Վիճակագրություն", p: "Կայքում օգտագործում ենք սեփական, առանց cookie-ների վիճակագրություն։ Այցելուի նույնացուցիչը փոխվում է ամեն օր և չի թույլատրում հետևել Ձեզ այլ կայքերում։" },
      { h: "Պահպանում և ջնջում", p: "Տվյալները պահվում են մեր սերվերներում այնքան, որքան անհրաժեշտ է նախագծի համար։ Կարող եք ցանկացած պահի խնդրել ջնջել դրանք։" },
    ],
    contact: "Հարցերի դեպքում գրեք՝",
  },
  ru: {
    title: "Политика конфиденциальности",
    updated: "Обновлено: сентябрь 2026",
    intro: "ArchiTek Soft уважает вашу конфиденциальность. На этой странице описано, какие данные мы собираем через сайт и сервис KitchenPro и как их используем.",
    sections: [
      { h: "Какие данные мы собираем", p: "При отправке заявки: имя, телефон, Telegram, e-mail, название компании и описание проекта, а также прикреплённые файлы (размеры, эскизы, фотографии)." },
      { h: "Как мы их используем", p: "Только для связи с вами, подготовки проекта и предоставления 3D-ссылки. Мы не продаём данные и не передаём их третьим лицам, кроме партнёров по производству — с вашего согласия." },
      { h: "Статистика", p: "На сайте используется собственная статистика без cookie. Идентификатор посетителя меняется ежедневно и не позволяет отслеживать вас на других сайтах." },
      { h: "Хранение и удаление", p: "Данные хранятся на наших серверах столько, сколько необходимо для проекта. Вы можете в любой момент попросить удалить их." },
    ],
    contact: "По вопросам пишите:",
  },
  en: {
    title: "Privacy Policy",
    updated: "Updated: September 2026",
    intro: "ArchiTek Soft respects your privacy. This page explains which data we collect through the website and the KitchenPro service, and how we use it.",
    sections: [
      { h: "What we collect", p: "When you send a request: name, phone, Telegram, e-mail, company name and project description, plus the files you attach (dimensions, sketches, photos)." },
      { h: "How we use it", p: "Only to contact you, prepare your project and deliver the 3D link. We do not sell your data or share it with third parties, except production partners — with your consent." },
      { h: "Analytics", p: "The website uses first-party, cookie-free analytics. The visitor identifier rotates daily and cannot track you across other websites." },
      { h: "Storage and deletion", p: "Data is stored on our servers for as long as the project requires. You can ask us to delete it at any time." },
    ],
    contact: "Questions? Write to",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  return pageMeta({ locale, path: "/privacy", title: TEXT[locale].title, description: TEXT[locale].intro });
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const brand = getSetting("brand");
  const t = TEXT[locale];

  return (
    <section className="container-narrow pt-10 pb-16 sm:pt-16 sm:pb-24">
      <div className="mb-6 flex items-center gap-3">
        <Index n={1} />
        <span className="eyebrow">{d.footer.privacy}</span>
      </div>
      <h1 className="font-display text-[2.1rem] leading-[1.05] font-medium tracking-[-0.02em] text-fg sm:text-[3rem]">{t.title}</h1>
      <p className="caption mt-4">{t.updated}</p>
      <p className="lead mt-8">{t.intro}</p>

      <div className="mt-12 sm:mt-16">
        <Ticks />
      </div>

      <div className="mt-2">
        {t.sections.map((s) => (
          <div key={s.h} className="grid gap-x-8 gap-y-3 border-b border-line py-7 sm:grid-cols-[10rem_1fr] sm:py-9">
            <h2 className="font-mono text-[11.5px] leading-6 font-medium tracking-[0.1em] text-muted uppercase">{s.h}</h2>
            <p className="text-[15.5px] leading-relaxed text-fg-2">{s.p}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-[15px] text-fg-2">
        {t.contact}{" "}
        <a href={`mailto:${brand.email}`} className="u-link font-medium text-fg">
          {brand.email}
        </a>
      </p>
    </section>
  );
}
