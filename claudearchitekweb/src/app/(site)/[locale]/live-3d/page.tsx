import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { ButtonLink, CheckList, Frame, Index, SectionHeading, Spec } from "@/components/ui";
import { TrackedCta } from "@/components/site/cta";
import { pageMeta } from "../meta";

/** Page-only strings: the quota broken down as a spec list. */
const LOCAL: Record<Locale, { realTime: string; spec: { k: string; v: string }[] }> = {
  hy: {
    realTime: "Իրական ժամանակում",
    spec: [
      { k: "Փորձառություն", v: "Ազատ քայլում · նյութերի ակնթարթային փոփոխություն" },
      { k: "Որակ", v: "4K · 60 FPS · իրական ժամանակի լուսավորություն" },
      { k: "Քվոտա", v: "օր.՝ 4 ժամ / 30 օր" },
      { k: "Սարք", v: "Հեռախոս, պլանշետ, սրահի էկրան, VR" },
      { k: "Գին", v: "Բիզնես փաթեթներում" },
    ],
  },
  ru: {
    realTime: "В реальном времени",
    spec: [
      { k: "Опыт", v: "Свободное перемещение · мгновенная смена материалов" },
      { k: "Качество", v: "4K · 60 FPS · свет в реальном времени" },
      { k: "Квота", v: "напр. 4 часа / 30 дней" },
      { k: "Устройство", v: "Телефон, планшет, экран в салоне, VR" },
      { k: "Цена", v: "В бизнес-пакетах" },
    ],
  },
  en: {
    realTime: "Real time",
    spec: [
      { k: "Experience", v: "Free walkthrough · instant material changes" },
      { k: "Quality", v: "4K · 60 FPS · real-time lighting" },
      { k: "Quota", v: "e.g. 4 hours / 30 days" },
      { k: "Device", v: "Phone, tablet, showroom screen, VR" },
      { k: "Price", v: "Inside business packages" },
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/live-3d", title: d.livePage.title, description: d.livePage.subtitle });
}

export default async function LivePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const l = d.livePage;
  const p = (path: string) => localePath(locale, path);
  const t = LOCAL[locale];

  return (
    <>
      {/* 01 — HERO on a dark stage */}
      <section className="stage grid-paper">
        <div className="container-x py-14 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-7 lg:pr-6">
              <div className="mb-6 flex items-baseline gap-3">
                <Index n={1} />
                <span className="eyebrow">{l.tag}</span>
              </div>
              <h1 className="h-display max-sm:break-words text-[2.2rem] sm:text-[3rem] lg:text-[3rem] xl:text-[3.6rem]">{l.title}</h1>
              <p className="lead mt-7 max-w-[34rem]">{l.subtitle}</p>
              <CheckList items={d.home.liveBullets} className="mt-8" />
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <TrackedCta href={p("/start?segment=b2b")} label="live-hero" locale={locale} segment="b2b" size="lg" className="bg-[#f4f2ed] text-[#17150f] hover:bg-[#fffdf9]">
                  {l.cta}
                  <ArrowUpRight size={18} />
                </TrackedCta>
                <ButtonLink href={p("/viewer")} variant="secondary" size="lg">
                  {l.compareCta}
                </ButtonLink>
              </div>
            </div>
            <div className="lg:col-span-5 lg:col-start-8 lg:self-center">
              <Frame marks aspect="aspect-[4/3]" caption="Live 3D · 4K · 60 FPS" captionRight={t.realTime}>
                <Image src="/demo/interior.jpg" alt="" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-sm bg-[#17150f]/70 px-2.5 py-1 font-mono text-[10.5px] tracking-[0.12em] text-[#f4f2ed] uppercase backdrop-blur">
                  <span className="dot bg-accent" />
                  Live
                </span>
              </Frame>
            </div>
          </div>
        </div>
      </section>

      {/* 02 — WHO IT IS FOR */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={2} eyebrow={l.tag} title={l.forTitle} />
        <ol className="mt-10 grid gap-x-8 gap-y-0 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          {l.forItems.map((it, i) => (
            <li key={it.title} className="border-t border-line-strong pt-5 pb-8 lg:pb-0">
              <Index n={i + 1} />
              <div className="mt-4 font-display text-[1.4rem] leading-tight text-fg">{it.title}</div>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted">{it.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 03 — HOW A SESSION WORKS */}
      <section className="container-x section-tight reveal">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionHeading index={3} eyebrow={d.home.stepsTag} title={l.howTitle} />
          </div>
          <ol className="divide-y divide-line border-y border-line lg:col-span-7 lg:col-start-6">
            {l.how.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[2.5rem_1fr] gap-4 py-5 sm:grid-cols-[3rem_1fr]">
                <Index n={i + 1} className="pt-1.5" />
                <div>
                  <div className="font-display text-[1.3rem] leading-tight text-fg">{s.title}</div>
                  <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 04 — QUOTA / PRICING */}
      <section className="container-x section-tight reveal">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <SectionHeading index={4} eyebrow={d.common.onRequest} title={l.quotaTitle} text={l.quotaText} />
            <ButtonLink href={p("/viewer")} variant="secondary" className="mt-8">
              {l.compareCta}
              <ArrowRight size={16} />
            </ButtonLink>
          </div>
          <div className="lg:col-span-6 lg:col-start-7 lg:pt-14">
            <Spec rows={t.spec.map((r) => ({ k: r.k, v: r.v }))} />
          </div>
        </div>
      </section>

      {/* 05 — CTA */}
      <section className="container-x pb-20 reveal sm:pb-28">
        <div className="rounded-xl bg-accent p-7 text-accent-fg sm:p-12">
          <div className="grid items-end gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="font-display text-[1.9rem] leading-[1.08] sm:text-[2.6rem]">{d.home.liveTitle}</h2>
              <p className="mt-4 max-w-lg text-[15px] opacity-85 sm:text-[16px]">{d.home.finalText}</p>
            </div>
            <div className="flex flex-col gap-3 lg:col-span-4 lg:col-start-9 lg:items-end">
              <TrackedCta href={p("/start?segment=b2b")} label="live-closing" locale={locale} segment="b2b" size="lg" className="w-full bg-[#17150f] text-[#f4f2ed] hover:bg-[#2a2620] sm:w-fit">
                {l.cta}
                <ArrowUpRight size={18} />
              </TrackedCta>
              <ButtonLink href={p("/for-business")} variant="ghost" className="w-full text-accent-fg hover:bg-accent-fg/15 hover:text-accent-fg sm:w-fit">
                {d.nav.business}
                <ArrowRight size={16} />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
