import type { Metadata } from "next";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { StartWizard } from "@/components/site/start-wizard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/start", title: d.start.tag, description: d.start.subtitle });
}

export default async function StartPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const segment = one(sp.segment);
  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const v = one(sp[k]);
    if (v) utm[k] = v.slice(0, 200);
  }

  return (
    <section className="container-x pt-12 pb-16 sm:pt-16 sm:pb-24">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <div className="eyebrow mb-4">{d.start.tag}</div>
        <h1 className="h-section sm:text-5xl">{d.start.title}</h1>
        <p className="lead mt-4">{d.start.subtitle}</p>
      </div>
      <StartWizard locale={locale} dict={d} initialSegment={segment} utm={utm} />
    </section>
  );
}
