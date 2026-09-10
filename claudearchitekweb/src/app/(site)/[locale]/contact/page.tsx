import type { Metadata } from "next";
import { Clock, MapPin } from "lucide-react";
import { getDictionary, isLocale, pickLang, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { getSetting } from "@/lib/settings";
import { IconBox, SectionHeading } from "@/components/ui";
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
    brand.address ? { icon: MapPin, label: c.addressLabel, value: String(pickLang(brand.address, locale, brand.address)) } : null,
    brand.workingHours ? { icon: Clock, label: c.hoursLabel, value: String(pickLang(brand.workingHours, locale, brand.workingHours)) } : null,
  ].filter(Boolean) as { icon: typeof MapPin; label: string; value: string }[];

  return (
    <>
      <section className="container-x pt-10 sm:pt-16 lg:pt-20">
        <SectionHeading eyebrow={c.tag} title={c.title} text={c.subtitle} size="display" className="max-w-3xl" />
      </section>

      <section className="container-x section-tight">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
          {/* channels */}
          <div>
            <div className="eyebrow mb-4">{c.channels}</div>
            <ContactChannels brand={brand} dict={{ common: d.common }} />
            {facts.length ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {facts.map((f) => (
                  <div key={f.label} className="card-inset flex items-start gap-3 p-4">
                    <IconBox tone="neutral">
                      <f.icon />
                    </IconBox>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold tracking-wide text-muted uppercase">{f.label}</span>
                      <span className="block text-sm font-medium text-fg">{f.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* form */}
          <div className="card p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-fg">{c.formTitle}</h2>
            <ContactForm
              locale={locale}
              className="mt-6"
              strings={{
                segment: c.segment,
                segB2b: c.segB2b,
                segB2c: c.segB2c,
                name: c.name,
                phone: c.phone,
                email: c.email,
                message: c.message,
                success: c.success,
                error: c.error,
                optional: d.common.optional,
                send: d.common.send,
                sending: d.common.sending,
              }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
