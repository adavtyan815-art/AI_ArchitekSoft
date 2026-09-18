import type { Metadata } from "next";
import { getDictionary, isLocale, pickLang, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { getSetting } from "@/lib/settings";
import { Index, Spec } from "@/components/ui";
import { ContactChannels } from "@/components/site/contact-channels";
import { ContactForm } from "@/components/site/contact-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/contact", title: d.nav.contact, description: d.contact.subtitle });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const brand = getSetting("brand");
  const c = d.contact;
  const facts = [
    brand.address ? { k: c.addressLabel, v: String(pickLang(brand.address, locale, brand.address)) } : null,
    brand.workingHours ? { k: c.hoursLabel, v: String(pickLang(brand.workingHours, locale, brand.workingHours)) } : null,
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <section className="container-x pt-10 pb-20 sm:pt-14 sm:pb-28 lg:pt-20">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        {/* left — statement, channels, facts */}
        <div className="min-w-0 lg:col-span-5">
          <div className="mb-6 flex items-baseline gap-3">
            <Index n={1} />
            <span className="eyebrow">{c.tag}</span>
          </div>
          <h1 className="h-display max-sm:break-words">{c.title}</h1>
          <p className="lead mt-7 max-w-[30rem]">{c.subtitle}</p>

          <div className="mt-12">
            <div className="kicker mb-4">{c.channels}</div>
            <ContactChannels brand={brand} dict={d} />
          </div>

          {facts.length ? <Spec rows={facts} className="mt-10" /> : null}
        </div>

        {/* right — form */}
        <div className="lg:col-span-6 lg:col-start-7">
          <div className="card p-6 sm:p-8 lg:p-10">
            <div className="mb-7 flex items-center gap-3 border-b border-line pb-5">
              <Index n={2} />
              <span className="eyebrow">{c.formTitle}</span>
            </div>
            <ContactForm
              locale={locale}
              strings={{
                segment: c.segment,
                segB2b: c.segB2b,
                segB2c: c.segB2c,
                name: c.name,
                phone: c.phone,
                telegram: c.telegram,
                company: c.company,
                email: c.email,
                message: c.message,
                success: c.success,
                error: c.error,
                nameRequired: c.nameRequired,
                requestNo: c.requestNo,
                optional: d.common.optional,
                send: d.common.send,
                sending: d.common.sending,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
