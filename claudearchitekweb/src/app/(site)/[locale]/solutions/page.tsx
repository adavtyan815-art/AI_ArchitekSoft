import Image from "next/image";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { ButtonLink, CheckList, Frame, Index, Ticks } from "@/components/ui";
import { cn } from "@/lib/utils";

const IMAGES = ["/demo/cottage.webp", "/demo/living.webp", "/demo/wardrobe.webp", "/demo/render-3.webp"];

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
  const total = String(s.items.length).padStart(2, "0");

  return (
    <>
      {/* ───────────────────────── 01 · HERO ───────────────────────── */}
      <section className="container-x pt-10 sm:pt-14 lg:pt-20">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="mb-6 flex items-center gap-3">
              <Index n={1} />
              <span className="eyebrow">{s.tag}</span>
            </div>
            <h1 className="h-display max-w-3xl">{s.title}</h1>
          </div>
          <p className="lead lg:col-span-4 lg:self-end">{s.subtitle}</p>
        </div>
        <div className="mt-12 sm:mt-16">
          <Ticks />
        </div>
      </section>

      {/* ───────────────────────── 02 · INDUSTRIES ───────────────────────── */}
      <section className="container-x pt-14 pb-4 sm:pt-20">
        <ol>
          {s.items.map((it, i) => {
            const flip = i % 2 === 1;
            return (
              <li key={it.title} className="reveal grid gap-8 border-t border-line py-12 sm:py-16 lg:grid-cols-12 lg:gap-10">
                <div className={cn("lg:col-span-5", flip ? "lg:order-2 lg:col-start-8" : "")}>
                  <Index n={i + 1} />
                  <h2 className="mt-5 font-display text-[1.75rem] leading-[1.1] text-fg sm:text-[2.4rem]">{it.title}</h2>
                  <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-fg-2">{it.text}</p>
                  <CheckList items={it.bullets} className="mt-7" />
                </div>
                <div className={cn("lg:col-span-6", flip ? "lg:order-1 lg:col-start-1" : "lg:col-start-7")}>
                  <Frame marks className="img-zoom" caption={it.title} captionRight={`${String(i + 1).padStart(2, "0")} / ${total}`}>
                    <div className="relative aspect-[4/3] bg-surface-2 sm:aspect-[16/10]">
                      <Image src={IMAGES[i] ?? IMAGES[0]} alt="" fill priority={i === 0} sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                    </div>
                  </Frame>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ───────────────────────── 03 · CTA ───────────────────────── */}
      <section className="container-x pt-10 pb-16 sm:pb-24 reveal">
        <div className="rounded-xl bg-accent p-7 text-accent-fg sm:p-12">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <h2 className="font-display text-[1.9rem] leading-[1.08] sm:text-[2.6rem]">{s.cta}</h2>
              <p className="mt-4 max-w-md text-[15px] opacity-85">{d.contact.subtitle}</p>
            </div>
            <div className="lg:col-span-5 lg:justify-self-end">
              <ButtonLink href={p("/contact")} size="lg" className="w-full bg-[#17150f] text-[#f4f2ed] hover:bg-[#2a2620] sm:w-fit">
                {d.common.contactUs}
                <ArrowUpRight size={18} />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
