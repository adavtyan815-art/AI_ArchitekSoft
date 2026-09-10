import Image from "next/image";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { ButtonLink, CheckList, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/utils";

const IMAGES = ["/demo/cottage.jpg", "/demo/interior.jpg", "/demo/living.jpg", "/demo/wardrobe.jpg"];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/solutions", title: d.nav.solutions, description: d.solutions.subtitle });
}

export default async function SolutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const s = d.solutions;

  return (
    <>
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="container-x pt-10 sm:pt-16 lg:pt-20">
        <SectionHeading eyebrow={s.tag} title={s.title} text={s.subtitle} size="display" className="max-w-3xl" />
      </section>

      {/* ───────────────────────── ALTERNATING ROWS ───────────────────────── */}
      <section className="container-x section-tight">
        <div className="space-y-14 sm:space-y-20 lg:space-y-24">
          {s.items.map((it, i) => {
            const flip = i % 2 === 1;
            return (
              <div key={it.title} className="grid items-center gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-14 reveal">
                <div className={cn("relative aspect-[4/3] overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-card", flip && "lg:order-2")}>
                  <Image
                    src={IMAGES[i] ?? IMAGES[0]}
                    alt=""
                    fill
                    priority={i === 0}
                    sizes="(min-width: 1024px) 46vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className={cn("min-w-0", flip && "lg:order-1")}>
                  <div className="kicker">0{i + 1}</div>
                  <h2 className="mt-3 h-section">{it.title}</h2>
                  <p className="lead mt-4">{it.text}</p>
                  <CheckList items={it.bullets} className="mt-6" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────── CTA ───────────────────────── */}
      <section className="container-x pt-4 pb-10 reveal">
        <div className="inverse rounded-3xl px-6 py-12 sm:px-12 sm:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_auto]">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{s.cta}</h2>
              <p className="mt-3 text-lg opacity-75">{d.contact.subtitle}</p>
            </div>
            <ButtonLink href={p("/contact")} size="lg" className="w-full bg-inverse-fg text-inverse-bg hover:opacity-90 sm:w-fit">
              {d.common.contactUs}
              <ArrowUpRight size={18} />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
