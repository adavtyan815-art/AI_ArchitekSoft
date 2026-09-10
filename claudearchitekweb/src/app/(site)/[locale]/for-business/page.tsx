import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Check, Clock, Eye, LayoutDashboard, Link2, Monitor, MonitorPlay, RefreshCw, Scissors, Sparkles } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { getSetting } from "@/lib/settings";
import { Badge, ButtonLink, CheckList, IconBox, SectionHeading } from "@/components/ui";
import { ContactChannels } from "@/components/site/contact-channels";
import { cn } from "@/lib/utils";

/** Page-only strings that have no dictionary key yet. */
const LOCAL: Record<Locale, { popular: string; quotaTitle: string; quotaText: string }> = {
  hy: {
    popular: "Ամենապահանջվածը",
    quotaTitle: "Ինչպես է աշխատում քվոտան",
    quotaText: "Live 3D-ն աշխատում է ամպային սերվերից, ուստի վաճառվում է ժամային քվոտայով (օր.՝ 4 ժամ / 30 օր)։ Այն նախատեսված է սրահի էկրանի, շնորհանդեսների և կարևոր հաճախորդների համար։ Ձեր մնացած պատվիրատուները ստանում են Web Viewer հղումը՝ առանց սահմանափակման։",
  },
  ru: {
    popular: "Чаще всего выбирают",
    quotaTitle: "Как работает квота",
    quotaText: "Live 3D работает с облачного сервера, поэтому продаётся по временной квоте (например, 4 часа / 30 дней). Он нужен для экрана в салоне, презентаций и важных клиентов. Остальные ваши заказчики получают ссылку Web Viewer без ограничений.",
  },
  en: {
    popular: "Most chosen",
    quotaTitle: "How the quota works",
    quotaText: "Live 3D runs on a cloud server, so it is sold as a time quota (e.g. 4 hours / 30 days). It is meant for the showroom screen, presentations and key clients. All your other customers get the Web Viewer link with no limits.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/for-business", title: d.nav.business, description: d.business.subtitle });
}

export default async function ForBusinessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const brand = getSetting("brand");
  const p = (path: string) => localePath(locale, path);
  const b = d.business;
  const painIcons = [Eye, RefreshCw, Clock, Scissors];
  const offerIcons = [Link2, MonitorPlay, Monitor, LayoutDashboard];
  const startB2b = p("/start?segment=b2b");
  const t = LOCAL[locale];

  return (
    <>
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="container-x pt-10 pb-8 sm:pt-16 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="max-w-xl">
            <div className="eyebrow mb-5">
              <span className="dot bg-accent" />
              {b.tag}
            </div>
            <h1 className="h-display">{b.title}</h1>
            <p className="lead mt-6">{b.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={startB2b} size="lg">
                {b.cta}
                <ArrowUpRight size={18} />
              </ButtonLink>
              <ButtonLink href={p("/portfolio")} variant="secondary" size="lg">
                {d.common.seeWork}
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">{d.home.heroNote}</p>
          </div>
          <div className="relative aspect-[16/11] overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-card">
            <Image src="/demo/kitchen-walnut.jpg" alt="" fill priority sizes="(min-width: 1024px) 46vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* ───────────────────────── PAINS ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading title={b.painsTitle} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {b.pains.map((it, i) => {
            const Icon = painIcons[i] ?? Eye;
            return (
              <div key={it.title} className="card p-5 sm:p-6">
                <IconBox tone="neutral">
                  <Icon />
                </IconBox>
                <div className="mt-4 h-card">{it.title}</div>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{it.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────── OFFER ───────────────────────── */}
      <section className="section-tight">
        <div className="container-x">
          <div className="inverse overflow-hidden rounded-3xl px-6 py-12 sm:px-10 sm:py-16 lg:px-14 reveal">
            <div className="max-w-2xl">
              <div className="eyebrow mb-4 text-accent">{d.nav.business}</div>
              <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{b.offerTitle}</h2>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4">
              {b.offer.map((it, i) => {
                const Icon = offerIcons[i] ?? Link2;
                const premium = i === 1;
                return (
                  <div key={it.title} className="flex gap-4 rounded-2xl border border-current/10 bg-current/5 p-5 sm:p-6">
                    <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accent text-accent-fg">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-lg font-semibold">{it.title}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase", premium ? "bg-accent text-accent-fg" : "bg-current/10")}>
                          {premium ? d.common.addon : d.common.included}
                        </span>
                      </div>
                      <p className="mt-2 text-[14.5px] leading-relaxed opacity-75">{it.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── STEPS ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading eyebrow={d.home.stepsTag} title={b.stepsTitle} />
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {b.steps.map((s, i) => (
            <li key={s.title} className="card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fg font-display text-sm font-bold text-bg">{i + 1}</div>
              <div className="mt-4 h-card">{s.title}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────────────────────── PACKAGES ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading title={b.packagesTitle} text={b.packagesNote} />
        <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
          {b.packages.map((pk) => {
            const featured = "featured" in pk && pk.featured;
            return (
              <div key={pk.name} className={cn("card flex flex-col p-6 sm:p-7", featured && "inverse border-transparent shadow-lift md:-mt-3 md:mb-3")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={cn("font-display text-2xl font-bold tracking-tight", featured ? "" : "text-fg")}>{pk.name}</div>
                    <div className={cn("mt-1 text-[13px] leading-snug", featured ? "opacity-70" : "text-muted")}>{pk.for}</div>
                  </div>
                  {featured ? <span className="flex-none rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold tracking-wide text-accent-fg uppercase">{t.popular}</span> : null}
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {pk.items.map((it) => (
                    <li key={it} className={cn("flex items-start gap-3 text-[15px] leading-snug", featured ? "opacity-85" : "text-fg-2")}>
                      <span className={cn("mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full", featured ? "bg-accent text-accent-fg" : "bg-accent-soft text-accent-soft-fg")}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
                <div className={cn("mt-6 text-sm font-semibold", featured ? "opacity-70" : "text-muted")}>{d.common.onRequest}</div>
                <ButtonLink href={startB2b} variant={featured ? "brand" : "secondary"} className="mt-4 w-full">
                  {pk.cta}
                  <ArrowRight size={16} />
                </ButtonLink>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────── LIVE 3D (PREMIUM) ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <div className="card grid gap-8 overflow-hidden p-6 sm:p-8 lg:grid-cols-2 lg:items-center lg:p-10">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="eyebrow">
                <MonitorPlay size={14} />
                {d.home.liveTag}
              </span>
              <Badge tone="brand">{d.common.addon}</Badge>
            </div>
            <h2 className="h-section">{d.home.liveTitle}</h2>
            <p className="lead mt-4">{d.home.liveText}</p>
            <CheckList items={d.home.liveBullets} className="mt-6" />
            <ButtonLink href={startB2b} className="mt-7 w-full sm:w-fit">
              {d.home.liveCta}
              <ArrowUpRight size={16} />
            </ButtonLink>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-2">
            <Image src="/demo/interior.jpg" alt="" fill sizes="(min-width: 1024px) 46vw, 100vw" className="object-cover" />
            <div className="absolute right-3 bottom-3 rounded-full bg-[#0b0d10]/65 px-3 py-1 text-[11px] font-semibold tracking-wide text-[#fff] uppercase backdrop-blur">Unreal Engine 5 · 4K</div>
          </div>
        </div>
        <div className="card-inset mt-4 flex items-start gap-4 p-5 sm:p-6">
          <IconBox tone="neutral">
            <Sparkles />
          </IconBox>
          <div>
            <div className="h-card">{t.quotaTitle}</div>
            <p className="mt-1.5 text-[15px] leading-relaxed text-fg-2">{t.quotaText}</p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── CONTACT ───────────────────────── */}
      <section className="container-x pt-4 pb-10 reveal">
        <div className="card-inset p-6 sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
            <div>
              <div className="eyebrow">{d.contact.channels}</div>
              <h2 className="mt-3 h-section">{d.contact.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{d.contact.subtitle}</p>
              <ButtonLink href={startB2b} className="mt-6 w-full sm:w-fit">
                {b.cta}
                <ArrowUpRight size={16} />
              </ButtonLink>
            </div>
            <ContactChannels brand={brand} dict={d} />
          </div>
        </div>
      </section>
    </>
  );
}
