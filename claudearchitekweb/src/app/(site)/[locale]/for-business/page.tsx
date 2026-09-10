import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { getSetting } from "@/lib/settings";
import { ButtonLink, CheckList, Frame, Index, SectionHeading, Spec, Tag, Ticks } from "@/components/ui";
import { ContactChannels } from "@/components/site/contact-channels";
import { cn } from "@/lib/utils";

/** Page-only strings that have no dictionary key yet. */
const LOCAL: Record<Locale, { popular: string; quotaTitle: string; quotaText: string; quotaSpec: { k: string; v: string }[] }> = {
  hy: {
    popular: "Ամենապահանջվածը",
    quotaTitle: "Ինչպես է աշխատում քվոտան",
    quotaText: "Live 3D-ն աշխատում է ամպային սերվերից, ուստի վաճառվում է ժամային քվոտայով (օր.՝ 4 ժամ / 30 օր)։ Այն նախատեսված է սրահի էկրանի, շնորհանդեսների և կարևոր հաճախորդների համար։ Ձեր մնացած պատվիրատուները ստանում են Web Viewer հղումը՝ առանց սահմանափակման։",
    quotaSpec: [
      { k: "Քվոտա", v: "օր.՝ 4 ժամ / 30 օր" },
      { k: "Սերվեր", v: "Ամպային GPU · Unreal Engine 5" },
      { k: "Ում համար", v: "Սրահի էկրան, շնորհանդեսներ, կարևոր հաճախորդներ" },
      { k: "Մնացածը", v: "Web Viewer հղում՝ առանց սահմանափակման" },
    ],
  },
  ru: {
    popular: "Чаще всего выбирают",
    quotaTitle: "Как работает квота",
    quotaText: "Live 3D работает с облачного сервера, поэтому продаётся по временной квоте (например, 4 часа / 30 дней). Он нужен для экрана в салоне, презентаций и важных клиентов. Остальные ваши заказчики получают ссылку Web Viewer без ограничений.",
    quotaSpec: [
      { k: "Квота", v: "напр. 4 часа / 30 дней" },
      { k: "Сервер", v: "Облачный GPU · Unreal Engine 5" },
      { k: "Для кого", v: "Экран в салоне, презентации, важные клиенты" },
      { k: "Остальные", v: "Ссылка Web Viewer без ограничений" },
    ],
  },
  en: {
    popular: "Most chosen",
    quotaTitle: "How the quota works",
    quotaText: "Live 3D runs on a cloud server, so it is sold as a time quota (e.g. 4 hours / 30 days). It is meant for the showroom screen, presentations and key clients. All your other customers get the Web Viewer link with no limits.",
    quotaSpec: [
      { k: "Quota", v: "e.g. 4 hours / 30 days" },
      { k: "Server", v: "Cloud GPU · Unreal Engine 5" },
      { k: "For", v: "Showroom screen, presentations, key clients" },
      { k: "Everyone else", v: "Web Viewer link, no limits" },
    ],
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
  const startB2b = p("/start?segment=b2b");
  const t = LOCAL[locale];

  return (
    <>
      {/* 01 — HERO */}
      <section className="container-x pt-10 sm:pt-14 lg:pt-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-6 lg:pr-6">
            <div className="mb-6 flex items-baseline gap-3">
              <Index n={1} />
              <span className="eyebrow">{b.tag}</span>
            </div>
            <h1 className="h-display max-sm:break-words">{b.title}</h1>
            <p className="lead mt-7 max-w-[34rem]">{b.subtitle}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={startB2b} size="lg">
                {b.cta}
                <ArrowUpRight size={18} />
              </ButtonLink>
              <ButtonLink href={p("/portfolio")} variant="secondary" size="lg">
                {d.common.seeWork}
              </ButtonLink>
            </div>
            <p className="caption mt-5">{d.home.heroNote}</p>
          </div>
          <div className="lg:col-span-6">
            <Frame marks aspect="aspect-[4/3] sm:aspect-[16/11]" caption="KitchenPro · Web Viewer · AR" captionRight="B2B">
              <Image src="/demo/kitchen-walnut.jpg" alt="" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </Frame>
          </div>
        </div>
        <div className="mt-14 sm:mt-20">
          <Ticks />
        </div>
      </section>

      {/* 02 — PAINS */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={2} eyebrow={d.nav.business} title={b.painsTitle} />
        <ol className="mt-10 grid gap-x-8 gap-y-0 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
          {b.pains.map((it, i) => (
            <li key={it.title} className="border-t border-line-strong pt-5 pb-8 lg:pb-0">
              <Index n={i + 1} />
              <div className="mt-4 font-display text-[1.3rem] leading-tight text-fg">{it.title}</div>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted">{it.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 03 — OFFER */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={3} eyebrow={d.home.viewerTag} title={b.offerTitle} />
        <ul className="mt-10 grid gap-x-12 sm:grid-cols-2">
          {b.offer.map((it, i) => {
            const premium = i === 1;
            return (
              <li key={it.title} className="border-t border-line py-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-[1.25rem] leading-tight text-fg">{it.title}</span>
                  <Tag className={cn(premium && "bg-accent-soft text-accent-soft-fg")}>{premium ? d.common.addon : d.common.included}</Tag>
                </div>
                <p className="mt-2.5 max-w-md text-[14.5px] leading-relaxed text-muted">{it.text}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 04 — HOW WE START */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={4} eyebrow={d.home.stepsTag} title={b.stepsTitle} />
        <div className="mt-10 lg:mt-14">
          <Ticks />
          <ol className="mt-7 grid gap-x-8 gap-y-9 md:grid-cols-3">
            {b.steps.map((s, i) => (
              <li key={s.title}>
                <Index n={i + 1} />
                <div className="mt-3 font-display text-[1.45rem] leading-tight text-fg">{s.title}</div>
                <p className="mt-2.5 max-w-sm text-[14.5px] leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 05 — PACKAGES */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={5} eyebrow={d.common.onRequest} title={b.packagesTitle} text={b.packagesNote} />
        <div className="mt-10 grid border-y border-line md:grid-cols-3 lg:mt-14">
          {b.packages.map((pk, i) => {
            const featured = "featured" in pk && pk.featured;
            return (
              <div key={pk.name} className={cn("flex flex-col p-6 sm:p-8", i > 0 && "border-t border-line md:border-t-0 md:border-l", featured && "inverse")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="caption">{d.common.onRequest}</div>
                  {featured ? <Tag className="bg-accent text-accent-fg">{t.popular}</Tag> : null}
                </div>
                <div className="mt-4 font-display text-[1.7rem] leading-tight text-fg">{pk.name}</div>
                <div className="mt-1.5 text-[13.5px] leading-snug text-muted">{pk.for}</div>
                <CheckList items={pk.items} className="mt-7 flex-1" />
                <ButtonLink href={startB2b} variant={featured ? "primary" : "secondary"} className={cn("mt-8 w-full", featured && "bg-inverse-fg text-inverse-bg hover:bg-inverse-fg/90")}>
                  {pk.cta}
                  <ArrowRight size={16} />
                </ButtonLink>
              </div>
            );
          })}
        </div>
      </section>

      {/* 06 — LIVE 3D (inverse band) */}
      <section className="mt-8 sm:mt-12">
        <div className="inverse">
          <div className="container-x py-16 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-5">
                <div className="mb-6 flex items-baseline gap-3">
                  <Index n={6} />
                  <span className="eyebrow">{d.home.liveTag}</span>
                </div>
                <h2 className="h-section">{d.home.liveTitle}</h2>
                <p className="mt-6 text-[16px] leading-relaxed text-fg-2">{d.home.liveText}</p>
                <CheckList items={d.home.liveBullets} className="mt-7" />
                <ButtonLink href={startB2b} className="mt-9 bg-inverse-fg text-inverse-bg hover:bg-inverse-fg/90">
                  {d.home.liveCta}
                  <ArrowUpRight size={16} />
                </ButtonLink>
              </div>
              <div className="lg:col-span-6 lg:col-start-7">
                <Frame marks aspect="aspect-[4/3]" caption="Unreal Engine 5 · 4K · 60 FPS" captionRight={d.common.addon}>
                  <Image src="/demo/interior.jpg" alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                </Frame>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quota note — spec list */}
      <section className="container-x section-tight reveal">
        <div className="grid gap-10 border-t border-line pt-8 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <h2 className="h-sub">{t.quotaTitle}</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">{t.quotaText}</p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <Spec rows={t.quotaSpec.map((r) => ({ k: r.k, v: r.v }))} />
          </div>
        </div>
      </section>

      {/* 07 — CONTACT */}
      <section className="container-x pb-20 reveal sm:pb-28">
        <div className="grid gap-10 border-t border-line pt-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <Index n={7} />
              <span className="eyebrow">{d.contact.channels}</span>
            </div>
            <h2 className="h-sub mt-5">{d.contact.title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{d.contact.subtitle}</p>
            <ContactChannels brand={brand} dict={d} className="mt-7" />
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <div className="rounded-xl bg-accent p-7 text-accent-fg sm:p-10">
              <h2 className="font-display text-[1.9rem] leading-[1.08] sm:text-[2.4rem]">{d.home.finalTitle}</h2>
              <p className="mt-3 max-w-md text-[15px] opacity-85">{d.home.finalText}</p>
              <ButtonLink href={startB2b} size="lg" className="mt-7 bg-[#17150f] text-[#f4f2ed] hover:bg-[#2a2620]">
                {b.cta}
                <ArrowUpRight size={18} />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
