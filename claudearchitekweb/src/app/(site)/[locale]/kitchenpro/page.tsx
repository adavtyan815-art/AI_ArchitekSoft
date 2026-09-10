import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { ButtonLink, Frame, Index, SectionHeading, Spec, Ticks } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Page-only labels that have no dictionary key yet. */
const LOCAL: Record<Locale, { whyTag: string; viewsTag: string; viewsTitle: string }> = {
  hy: { whyTag: "Խնդիրը և լուծումը", viewsTag: "Ով ինչ է տեսնում", viewsTitle: "Նույն մոդելի երկու կողմը" },
  ru: { whyTag: "Проблема и решение", viewsTag: "Кто что видит", viewsTitle: "Две стороны одной модели" },
  en: { whyTag: "Problem and solution", viewsTag: "Who sees what", viewsTitle: "Two sides of one model" },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/kitchenpro", title: d.nav.kitchenpro, description: d.kitchenpro.subtitle });
}

export default async function KitchenProPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const k = d.kitchenpro;
  const t = LOCAL[locale];

  const audiences = [
    { code: "B2B", title: k.b2bTitle, text: k.b2bText, img: "/demo/kitchen-walnut.webp", href: p("/for-business"), cta: d.nav.business, caption: "Maker workspace" },
    { code: "B2C", title: k.b2cTitle, text: k.b2cText, img: "/demo/render-2.webp", href: p("/for-home"), cta: d.nav.home, caption: "Client page · Web Viewer" },
  ];

  return (
    <>
      {/* ───────────────────────── 01 · HERO ───────────────────────── */}
      <section className="container-x pt-10 sm:pt-14 lg:pt-20">
        <div className="mb-6 flex items-center gap-3">
          <Index n={1} />
          <span className="eyebrow">{d.nav.kitchenpro}</span>
        </div>
        <h1 className="h-display max-w-4xl">{k.title}</h1>
        <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5 lg:pr-4">
            <p className="lead max-w-[34rem]">{k.subtitle}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={p("/start?segment=b2b")} size="lg">
                {k.cta}
                <ArrowUpRight size={18} />
              </ButtonLink>
              <ButtonLink href={p("/how-it-works")} variant="secondary" size="lg">
                {d.nav.howItWorks}
              </ButtonLink>
            </div>
            <p className="caption mt-5">{d.home.heroNote}</p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <Frame marks caption="KitchenPro · Unreal Engine 5" captionRight="01 / RENDER">
              <div className="relative aspect-[4/3] bg-surface-2 sm:aspect-[16/10]">
                <Image src="/demo/render-1.webp" alt="" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
              </div>
            </Frame>
          </div>
        </div>
        <div className="mt-14 sm:mt-20">
          <Ticks />
        </div>
      </section>

      {/* ───────────────────────── 02 · PROBLEM / SOLUTION ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <div className="mb-8 flex items-center gap-3 sm:mb-10">
          <Index n={2} />
          <span className="eyebrow">{t.whyTag}</span>
        </div>
        <div className="grid gap-10 md:grid-cols-2 md:gap-0">
          <div className="md:pr-12 lg:pr-16">
            <span aria-hidden className="block h-px w-10 bg-line-strong" />
            <h2 className="h-sub mt-6 max-w-md text-muted">{k.problemTitle}</h2>
            <p className="mt-5 text-[16px] leading-relaxed text-muted">{k.problemText}</p>
          </div>
          <div className="border-t border-line pt-10 md:border-t-0 md:border-l md:pt-0 md:pl-12 lg:pl-16">
            <span aria-hidden className="block h-px w-10 bg-accent" />
            <h2 className="h-sub mt-6 max-w-md">{k.solutionTitle}</h2>
            <p className="mt-5 text-[16px] leading-relaxed text-fg-2">{k.solutionText}</p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── 03 · CAPABILITIES ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={3} eyebrow={d.nav.kitchenpro} title={k.capabilitiesTitle} />
        <ol className="mt-10 grid border-t border-line sm:grid-cols-2 sm:gap-x-12 lg:mt-14 lg:gap-x-20">
          {k.capabilities.map((c, i) => (
            <li key={c.title} className="grid grid-cols-[2.25rem_1fr] gap-4 border-b border-line py-6 sm:grid-cols-[2.75rem_1fr]">
              <Index n={i + 1} className="pt-1.5" />
              <div>
                <h3 className="font-display text-[1.25rem] leading-snug text-fg">{c.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{c.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────────────────────── 04 · WORKFLOW 0–6 ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5 lg:pr-6">
            <SectionHeading index={4} eyebrow={d.nav.howItWorks} title={k.workflowTitle} />
            <div className="mt-8 lg:sticky lg:top-28">
              <Frame marks caption="Sketch → room model" captionRight="STAGE 01">
                <div className="relative aspect-[4/3] bg-surface-2">
                  <Image src="/demo/sketch.webp" alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
                </div>
              </Frame>
            </div>
          </div>
          <ol className="lg:col-span-6 lg:col-start-7">
            {k.workflow.map((w, i) => {
              const last = i === k.workflow.length - 1;
              return (
                <li key={w.stage} className="grid grid-cols-[2.5rem_1fr] sm:grid-cols-[3rem_1fr]">
                  <span className="index pt-0.5">{String(w.stage).padStart(2, "0")}</span>
                  <div className={cn("relative border-l pl-6 sm:pl-8", last ? "border-transparent pb-0" : "border-line pb-10")}>
                    <span aria-hidden className="absolute top-[0.7rem] left-0 h-px w-3 bg-line-strong sm:w-4" />
                    <h3 className="font-display text-[1.3rem] leading-snug text-fg sm:text-[1.45rem]">{w.title}</h3>
                    <p className="mt-2 max-w-lg text-[14.5px] leading-relaxed text-muted">{w.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ───────────────────────── 05 · WHO SEES WHAT ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={5} eyebrow={t.viewsTag} title={t.viewsTitle} />
        <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-8 lg:mt-14">
          {audiences.map((a) => (
            <Link key={a.code} href={a.href} className="group block">
              <Frame
                marks
                className="img-zoom"
                caption={
                  <>
                    <span className="text-accent">{a.code}</span>
                    <span className="mx-2 text-faint">/</span>
                    {a.caption}
                  </>
                }
                captionRight={<ArrowUpRight size={14} className="text-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />}
              >
                <div className="relative aspect-[16/10] bg-surface-2">
                  <Image src={a.img} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                </div>
              </Frame>
              <h3 className="mt-6 font-display text-[1.6rem] leading-tight text-fg sm:text-[1.85rem]">{a.title}</h3>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-fg-2">{a.text}</p>
              <span className="link-arrow mt-6 group-hover:text-accent">
                {a.cta}
                <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>

        {/* honest status, as a spec row */}
        <Spec className="mt-12 sm:mt-16" rows={[{ k: k.statusTitle, v: <span className="max-w-3xl text-fg-2">{k.statusText}</span> }]} />
      </section>

      {/* ───────────────────────── 06 · CTA ───────────────────────── */}
      <section className="container-x pt-6 pb-16 sm:pb-24 reveal">
        <div className="rounded-xl bg-accent p-7 text-accent-fg sm:p-12">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <h2 className="font-display text-[1.9rem] leading-[1.08] sm:text-[2.6rem]">{d.home.finalTitle}</h2>
              <p className="mt-4 max-w-md text-[15px] opacity-85">{d.home.finalText}</p>
            </div>
            <div className="lg:col-span-5 lg:justify-self-end">
              <ButtonLink href={p("/start?segment=b2b")} size="lg" className="w-full bg-[#17150f] text-[#f4f2ed] hover:bg-[#2a2620] sm:w-fit">
                {k.cta}
                <ArrowUpRight size={18} />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
