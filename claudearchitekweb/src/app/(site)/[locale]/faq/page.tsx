import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { ButtonLink, SectionHeading } from "@/components/ui";
import { Faq } from "@/components/site/faq";
import { ContactChannels } from "@/components/site/contact-channels";
import { pageMeta } from "../meta";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/faq", title: d.faqPage.title, description: d.faqPage.subtitle });
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const brand = getSetting("brand");
  const p = (path: string) => localePath(locale, path);
  const items = [...d.home.faq, ...d.faqPage.more];

  return (
    <>
      <section className="container-x pt-10 sm:pt-16">
        <SectionHeading eyebrow={d.faqPage.tag} title={d.faqPage.title} text={d.faqPage.subtitle} size="display" className="max-w-3xl" />
      </section>
      <section className="container-x section-tight">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <Faq items={items} />
          <div className="card-inset p-6 lg:sticky lg:top-28">
            <div className="h-card">{d.contact.title}</div>
            <p className="mt-2 text-sm text-muted">{d.contact.subtitle}</p>
            <div className="mt-4">
              <ContactChannels brand={brand} dict={d} compact />
            </div>
            <ButtonLink href={p("/start")} className="mt-6 w-full">
              {d.common.startProject}
              <ArrowUpRight size={16} />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
