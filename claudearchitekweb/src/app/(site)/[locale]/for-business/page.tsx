import type { Metadata } from "next";
import { ArrowRight, Check, Clock, Eye, LayoutDashboard, Link2, Monitor, Package, RefreshCw, Scissors } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { ButtonLink, SectionHeading } from "@/components/ui";
import { ContactChannels } from "@/components/site/contact-channels";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const d = getDictionary((isLocale(raw) ? raw : "hy") as Locale);
  return { title: d.nav.business, description: d.business.subtitle };
}

export default async function ForBusinessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const brand = getSetting("brand");
  const p = (path: string) => localePath(locale, path);
  const b = d.business;
  const painIcons = [Eye, RefreshCw, Scissors, Clock];
  const offerIcons = [Link2, Package, Monitor, LayoutDashboard];
  const startB2b = p("/start?segment=b2b");

  return (
    <>
      {/* HERO */}
      <section className="container-x pt-14 pb-10 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="eyebrow mb-4">{b.tag}</div>
            <h1 className="h-display">{b.title}</h1>
            <p className="lead mt-6 max-w-xl">{b.subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href={startB2b} size="lg">
                {b.cta}
                <ArrowRight size={18} />
              </ButtonLink>
              <ButtonLink href={p("/portfolio")} variant="secondary" size="lg">
                {d.common.seeWork}
              </ButtonLink>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/demo/kitchen-walnut.jpg" alt="" className="aspect-[16/11] w-full object-cover" />
          </div>
        </div>
      </section>

      {/* PAINS */}
      <section className="container-x py-16 sm:py-20">
        <SectionHeading title={b.painsTitle} />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {b.pains.map((it, i) => {
            const Icon = painIcons[i] ?? Eye;
            return (
              <div key={it.title} className="card p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-700">
                  <Icon size={18} />
                </span>
                <div className="mt-4 text-base font-semibold text-ink-950">{it.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{it.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* OFFER */}
      <section className="bg-ink-950 text-white">
        <div className="container-x py-16 sm:py-24">
          <div className="max-w-2xl">
            <div className="eyebrow mb-3 text-brand-300">{d.nav.business}</div>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{b.offerTitle}</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {b.offer.map((it, i) => {
              const Icon = offerIcons[i] ?? Package;
              return (
                <div key={it.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                      <Icon size={18} />
                    </span>
                    <div>
                      <div className="text-lg font-semibold">{it.title}</div>
                      <p className="mt-2 text-sm leading-relaxed text-ink-300">{it.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="container-x py-16 sm:py-20">
        <SectionHeading eyebrow={d.home.stepsTag} title={b.stepsTitle} />
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {b.steps.map((s, i) => (
            <li key={s.title} className="card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-950 text-sm font-semibold text-white">{i + 1}</div>
              <div className="mt-4 text-lg font-semibold text-ink-950">{s.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* PACKAGES */}
      <section className="container-x pb-16 sm:pb-20">
        <SectionHeading title={b.packagesTitle} text={b.packagesNote} />
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {b.packages.map((pk) => {
            const featured = "featured" in pk && pk.featured;
            return (
              <div key={pk.name} className={cn("card flex flex-col p-6 sm:p-7", featured && "border-ink-950 bg-ink-950 text-white shadow-card")}>
                <div className={cn("eyebrow", featured ? "text-brand-300" : "text-ink-500")}>{pk.for}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">{pk.name}</div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {pk.items.map((it) => (
                    <li key={it} className={cn("flex items-start gap-3 text-sm", featured ? "text-ink-200" : "text-ink-700")}>
                      <span className={cn("mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full", featured ? "bg-brand-500/25 text-brand-300" : "bg-brand-50 text-brand-600")}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
                <ButtonLink href={startB2b} variant={featured ? "brand" : "secondary"} className="mt-7 w-full">
                  {pk.cta}
                  <ArrowRight size={16} />
                </ButtonLink>
              </div>
            );
          })}
        </div>
      </section>

      {/* CONTACT */}
      <section className="container-x pb-8">
        <div className="rounded-3xl border border-line bg-paper-2 p-6 sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <div className="eyebrow">{d.contact.channels}</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink-950">{d.contact.title}</h2>
              <p className="mt-3 text-ink-600">{d.contact.subtitle}</p>
              <ButtonLink href={startB2b} className="mt-6">
                {b.cta}
                <ArrowRight size={16} />
              </ButtonLink>
            </div>
            <ContactChannels brand={brand} dict={d} />
          </div>
        </div>
      </section>
    </>
  );
}
