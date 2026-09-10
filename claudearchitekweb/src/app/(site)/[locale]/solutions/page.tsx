import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { ButtonLink, CheckList } from "@/components/ui";
import { cn } from "@/lib/utils";

const IMAGES = ["/demo/cottage.jpg", "/demo/interior.jpg", "/demo/living.jpg", "/demo/wardrobe.jpg"];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const d = getDictionary((isLocale(raw) ? raw : "hy") as Locale);
  return { title: d.nav.solutions, description: d.solutions.subtitle };
}

export default async function SolutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const s = d.solutions;

  return (
    <>
      <section className="container-x pt-14 pb-6 sm:pt-20">
        <div className="max-w-2xl">
          <div className="eyebrow mb-4">{s.tag}</div>
          <h1 className="h-display">{s.title}</h1>
          <p className="lead mt-6">{s.subtitle}</p>
        </div>
      </section>

      <section className="container-x py-10 sm:py-14">
        <div className="space-y-16 sm:space-y-24">
          {s.items.map((it, i) => {
            const flip = i % 2 === 1;
            return (
              <div key={it.title} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <div className={cn("overflow-hidden rounded-3xl border border-line bg-white shadow-card", flip && "lg:order-2")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={IMAGES[i] ?? IMAGES[0]} alt="" className="aspect-[4/3] w-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
                </div>
                <div className={cn(flip && "lg:order-1")}>
                  <div className="eyebrow text-ink-500">0{i + 1}</div>
                  <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-ink-950">{it.title}</h2>
                  <p className="mt-4 text-lg leading-relaxed text-ink-600">{it.text}</p>
                  <CheckList items={it.bullets} className="mt-6" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container-x pt-8 pb-8">
        <div className="rounded-3xl bg-ink-950 px-6 py-12 text-white sm:px-12 sm:py-16">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{s.cta}</h2>
              <p className="mt-3 text-lg text-ink-300">{d.contact.subtitle}</p>
            </div>
            <ButtonLink href={p("/contact")} size="lg" className="bg-white text-ink-950 hover:bg-brand-50">
              {d.common.contactUs}
              <ArrowRight size={18} />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
