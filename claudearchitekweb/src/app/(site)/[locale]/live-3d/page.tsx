import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Building2, Clock, Link2, MonitorSmartphone, Store, Users } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { ButtonLink, CheckList, IconBox, SectionHeading } from "@/components/ui";
import { pageMeta } from "../meta";

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
  const forIcons = [Store, Building2, Users];
  const howIcons = [Link2, Clock, MonitorSmartphone];

  return (
    <>
      <section className="container-x pt-10 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="max-w-xl">
            <div className="eyebrow mb-5">{l.tag}</div>
            <h1 className="h-display">{l.title}</h1>
            <p className="lead mt-6">{l.subtitle}</p>
            <CheckList items={d.home.liveBullets} className="mt-6" />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={p("/start?segment=b2b")} size="lg">
                {l.cta}
                <ArrowUpRight size={18} />
              </ButtonLink>
              <ButtonLink href={p("/viewer")} variant="secondary" size="lg">
                {l.compareCta}
              </ButtonLink>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-card">
            <Image src="/demo/interior.jpg" alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" priority />
            <div className="absolute right-3 bottom-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold tracking-wide text-white uppercase backdrop-blur">Unreal Engine 5 · 4K · 60 FPS</div>
          </div>
        </div>
      </section>

      <section className="container-x section-tight">
        <SectionHeading title={l.forTitle} />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {l.forItems.map((it, i) => {
            const Icon = forIcons[i];
            return (
              <div key={it.title} className="card p-6">
                <IconBox>
                  <Icon />
                </IconBox>
                <div className="mt-5 h-card">{it.title}</div>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{it.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container-x section-tight">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionHeading title={l.howTitle} />
            <ol className="mt-8 space-y-3">
              {l.how.map((h, i) => {
                const Icon = howIcons[i];
                return (
                  <li key={h.title} className="card flex gap-4 p-5">
                    <IconBox tone="neutral">
                      <Icon />
                    </IconBox>
                    <div>
                      <div className="h-card">{h.title}</div>
                      <p className="mt-1 text-[15px] leading-relaxed text-muted">{h.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="card-inset h-fit p-6 sm:p-8 lg:sticky lg:top-28">
            <h2 className="h-card text-xl">{l.quotaTitle}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-fg-2">{l.quotaText}</p>
            <ButtonLink href={p("/for-business")} variant="secondary" className="mt-6">
              {d.nav.business}
              <ArrowRight size={16} />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
