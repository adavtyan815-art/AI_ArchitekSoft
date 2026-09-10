import Image from "next/image";
import type { Metadata } from "next";
import { ArrowUpRight, Cpu, Eye, Ruler } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { ButtonLink, IconBox, SectionHeading } from "@/components/ui";
import { ContactChannels } from "@/components/site/contact-channels";
import { pageMeta } from "../meta";

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
  const brand = getSetting("brand");
  const p = (path: string) => localePath(locale, path);
  const icons = [Eye, Ruler, Cpu];

  return (
    <>
      <section className="container-x pt-10 sm:pt-16">
        <SectionHeading eyebrow={a.tag} title={a.title} text={a.subtitle} size="display" className="max-w-3xl" />
      </section>

      <section className="container-x section-tight">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line bg-surface-2">
            <Image src="/demo/interior.jpg" alt="" fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
          </div>
          <div>
            <h2 className="h-section">{a.whatTitle}</h2>
            <p className="lead mt-4">{a.whatText}</p>
          </div>
        </div>
      </section>

      <section className="container-x section-tight">
        <SectionHeading title={a.approachTitle} />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {a.approach.map((it, i) => {
            const Icon = icons[i];
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
          <div className="card-inset p-6 sm:p-8">
            <h2 className="h-section">{a.techTitle}</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-fg-2">{a.techText}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Unreal Engine 5", "Web 3D", "AR", "Pixel Streaming", "KitchenPro", "EGGER", "Blum", "Hettich"].map((t) => (
                <span key={t} className="pill">{t}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="kicker mb-4">{a.factsTitle}</div>
            <ul className="grid grid-cols-2 gap-3">
              {a.facts.map((f) => (
                <li key={f.label} className="card p-5">
                  <div className="font-display text-xl font-bold tracking-tight text-fg">{f.value}</div>
                  <div className="mt-1 text-sm text-muted">{f.label}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-x section-tight">
        <div className="card grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <h2 className="h-section">{d.contact.title}</h2>
            <p className="mt-3 text-muted">{d.contact.subtitle}</p>
            <ButtonLink href={p("/contact")} className="mt-6">
              {a.cta}
              <ArrowUpRight size={16} />
            </ButtonLink>
          </div>
          <ContactChannels brand={brand} dict={d} />
        </div>
      </section>
    </>
  );
}
