import type { Metadata } from "next";
import { Clock, MapPin } from "lucide-react";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { ContactChannels } from "@/components/site/contact-channels";
import { ContactForm } from "@/components/site/contact-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const d = getDictionary((isLocale(raw) ? raw : "hy") as Locale);
  return { title: d.nav.contact, description: d.contact.subtitle };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const brand = getSetting("brand");
  const c = d.contact;

  return (
    <section className="container-x pt-14 pb-16 sm:pt-20 sm:pb-24">
      <div className="max-w-2xl">
        <div className="eyebrow mb-4">{c.tag}</div>
        <h1 className="h-display">{c.title}</h1>
        <p className="lead mt-6">{c.subtitle}</p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <div>
          <div className="eyebrow mb-4">{c.channels}</div>
          <ContactChannels brand={brand} dict={d} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {brand.address ? (
              <div className="card flex items-start gap-3 p-4">
                <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ink-100 text-ink-700">
                  <MapPin size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-ink-500">{c.addressLabel}</span>
                  <span className="block text-sm font-medium text-ink-900">{brand.address}</span>
                </span>
              </div>
            ) : null}
            {brand.workingHours ? (
              <div className="card flex items-start gap-3 p-4">
                <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ink-100 text-ink-700">
                  <Clock size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-ink-500">{c.hoursLabel}</span>
                  <span className="block text-sm font-medium text-ink-900">{brand.workingHours}</span>
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-950">{c.formTitle}</h2>
          <ContactForm locale={locale} dict={d} className="mt-6" />
        </div>
      </div>
    </section>
  );
}
