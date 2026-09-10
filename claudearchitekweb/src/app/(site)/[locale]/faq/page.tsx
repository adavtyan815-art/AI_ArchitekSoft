import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { ButtonLink, Index, Ticks } from "@/components/ui";
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
      {/* ───────────────────────── 01 · HERO ───────────────────────── */}
      <section className="container-x pt-10 sm:pt-14 lg:pt-20">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="mb-6 flex items-center gap-3">
              <Index n={1} />
              <span className="eyebrow">{d.faqPage.tag}</span>
            </div>
            <h1 className="h-display max-w-2xl">{d.faqPage.title}</h1>
          </div>
          <p className="lead lg:col-span-4 lg:self-end">{d.faqPage.subtitle}</p>
        </div>
        <div className="mt-12 sm:mt-16">
          <Ticks />
        </div>
      </section>

      {/* ───────────────────────── 02 · QUESTIONS ───────────────────────── */}
      <section className="container-x pt-12 pb-16 sm:pt-16 sm:pb-24">
        <div className="reveal grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <Faq items={items} />
          </div>

          <aside className="lg:col-span-4 lg:col-start-9">
            <div className="border-t border-line pt-6 lg:sticky lg:top-28">
              <div className="mb-5 flex items-center gap-3">
                <Index n={2} />
                <span className="eyebrow">{d.contact.channels}</span>
              </div>
              <h2 className="h-sub">{d.contact.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{d.contact.subtitle}</p>
              <div className="mt-7 border-t border-line pt-5">
                <ContactChannels brand={brand} dict={d} compact />
              </div>
              <ButtonLink href={p("/start")} size="lg" className="mt-8 w-full">
                {d.common.startProject}
                <ArrowUpRight size={18} />
              </ButtonLink>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
