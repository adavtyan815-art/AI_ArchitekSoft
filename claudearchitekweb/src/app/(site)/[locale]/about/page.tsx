import Image from "next/image";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { ButtonLink, Frame, Index, SectionHeading, Spec, Stat, Ticks } from "@/components/ui";
import { ContactChannels } from "@/components/site/contact-channels";
import { pageMeta } from "../meta";
import { cn } from "@/lib/utils";

/** Material board — same board as the home page platform band. */
const MATERIALS: { label: string; fill: string }[] = [
  { label: "EGGER H1180", fill: "linear-gradient(135deg,#b58a5a,#8d6238)" },
  { label: "EGGER U708", fill: "#c9c3b8" },
  { label: "EGGER W1000", fill: "#f1efe9" },
  { label: "Fenix 0720", fill: "#2b2a28" },
  { label: "EGGER H3131", fill: "linear-gradient(135deg,#a8865e,#7a5a3a)" },
  { label: "EGGER U626", fill: "#6c7a5c" },
];

/**
 * Capabilities as a spec list — customer-facing, language-neutral. No implementation details on the
 * public site. Page-local strings, like the other pages that carry captions of their own; product
 * names (AR, Live 3D, Web Viewer) stay literal in every language.
 */
const LOCAL: Record<Locale, { stackTag: string; studio: string; stack: { k: string; v: string }[] }> = {
  hy: {
    stackTag: "Հնարավորություններ",
    studio: "ArchiTek Soft · Ստուդիա",
    stack: [
      { k: "3D", v: "Իրական ժամանակում · ճշգրիտ չափերով · իրական նյութերով" },
      { k: "Web", v: "Ինտերակտիվ դիտում · ցանկացած հեռախոս կամ համակարգիչ · առանց տեղադրման" },
      { k: "AR", v: "Պատվիրատուի սենյակում · 1:1 մասշտաբով" },
      { k: "Live 3D", v: "Կինոյի որակի ցուցադրություն · 4K · սրահի էկրաններ" },
      { k: "Հարթակ", v: "Հաճախորդի էջեր · հաստատումներ · արտադրական փաստաթղթեր" },
    ],
  },
  ru: {
    stackTag: "Возможности",
    studio: "ArchiTek Soft · Студия",
    stack: [
      { k: "3D", v: "В реальном времени · точно по размерам · реальные материалы" },
      { k: "Web", v: "Интерактивный просмотр · любой телефон или компьютер · без установки" },
      { k: "AR", v: "В комнате заказчика · масштаб 1:1" },
      { k: "Live 3D", v: "Кинематографичная презентация · 4K · экраны в салонах" },
      { k: "Платформа", v: "Страницы клиента · согласования · производственные документы" },
    ],
  },
  en: {
    stackTag: "Capabilities",
    studio: "ArchiTek Soft · Studio",
    stack: [
      { k: "3D", v: "Real-time · true to size · real materials" },
      { k: "Web", v: "Interactive viewing · any phone or computer · no installation" },
      { k: "AR", v: "In the customer's room · 1:1 scale" },
      { k: "Live 3D", v: "Cinematic presentation · 4K · showroom screens" },
      { k: "Platform", v: "Client pages · approvals · production documents" },
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/about", title: d.about.title, description: d.about.subtitle });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const a = d.about;
  const t = LOCAL[locale];
  const brand = getSetting("brand");
  const p = (path: string) => localePath(locale, path);

  return (
    <>
      {/* ───────────────────────── 01 · STATEMENT ───────────────────────── */}
      <section className="container-x pt-10 sm:pt-14 lg:pt-20">
        <div className="mb-7 flex items-center gap-3">
          <Index n={1} />
          <span className="eyebrow">{a.tag}</span>
        </div>
        <h1 className="h-display max-w-4xl">{a.title}</h1>
        <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:gap-8">
          <p className="lead lg:col-span-5">{a.subtitle}</p>
          <p className="font-display text-[1.35rem] leading-[1.35] text-fg-2 lg:col-span-6 lg:col-start-7 sm:text-[1.55rem]">{a.whatText}</p>
        </div>
      </section>

      {/* full-bleed frame */}
      <section className="container-x mt-12 sm:mt-16">
        <Frame marks caption={a.whatTitle} captionRight={t.studio}>
          <div className="relative aspect-[4/3] bg-surface-2 sm:aspect-[21/9]">
            <Image src="/demo/interior.webp" alt="" fill priority sizes="100vw" className="object-cover" />
          </div>
        </Frame>
      </section>

      {/* ───────────────────────── 02 · APPROACH ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={2} eyebrow={a.tag} title={a.approachTitle} />
        <ol className="mt-10 grid border-t border-line md:grid-cols-3 lg:mt-14">
          {a.approach.map((it, i) => (
            <li key={it.title} className={cn("border-b border-line py-7 md:border-b-0 md:py-9", i > 0 ? "md:border-l md:border-line md:pl-8 lg:pl-10" : "md:pr-8 lg:pr-10", i > 0 && i < a.approach.length - 1 && "md:pr-8 lg:pr-10")}>
              <Index n={i + 1} />
              <h3 className="mt-4 font-display text-[1.45rem] leading-tight text-fg sm:text-[1.6rem]">{it.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{it.text}</p>
            </li>
          ))}
        </ol>
        <hr className="rule hidden md:block" />
      </section>

      {/* ───────────────────────── 03 · TECHNOLOGY ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <SectionHeading index={3} eyebrow={t.stackTag} title={a.techTitle} />
            <p className="mt-6 text-[15px] leading-relaxed text-fg-2">{a.techText}</p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <Spec rows={t.stack.map((s) => ({ k: s.k, v: <span className="font-mono text-[13.5px] text-fg-2">{s.v}</span> }))} />
            <div className="mt-9 flex flex-wrap items-end gap-x-5 gap-y-4" aria-hidden>
              {MATERIALS.map((m) => (
                <div key={m.label} className="flex flex-col items-start gap-1.5">
                  <span className="h-9 w-12 rounded-sm border border-line-strong" style={{ background: m.fill }} />
                  <span className="font-mono text-[10px] tracking-[0.08em] text-muted uppercase">{m.label}</span>
                </div>
              ))}
              <span className="caption pb-1">EGGER · Blum · Hettich · Fenix</span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── 04 · FACTS ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={4} eyebrow={a.tag} title={a.factsTitle} />
        <div className="mt-10 sm:mt-12">
          <Ticks />
          <ul className="mt-7 grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-4">
            {a.facts.map((f) => (
              <li key={f.label}>
                <Stat value={<span className="text-[1.5rem] sm:text-[1.9rem]">{f.value}</span>} label={f.label} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────────────────── 05 · CONTACT ───────────────────────── */}
      <section className="container-x pt-6 pb-16 sm:pb-24 reveal">
        <div className="grid gap-10 border-t border-line pt-8 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <Index n={5} />
              <span className="eyebrow">{d.contact.tag}</span>
            </div>
            <h2 className="h-section mt-5">{d.contact.title}</h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-fg-2">{d.contact.subtitle}</p>
            <ButtonLink href={p("/contact")} size="lg" className="mt-8">
              {a.cta}
              <ArrowUpRight size={18} />
            </ButtonLink>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <ContactChannels brand={brand} dict={d} />
          </div>
        </div>
      </section>
    </>
  );
}
