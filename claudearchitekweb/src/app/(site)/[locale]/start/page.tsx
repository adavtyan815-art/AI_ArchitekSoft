import type { Metadata } from "next";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { Index } from "@/components/ui";
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
    <section className="container-x pt-10 pb-4 sm:pt-14 md:pb-24">
      <div className="mx-auto mb-12 max-w-2xl sm:mb-14">
        <div className="mb-6 flex items-baseline gap-3">
          <Index n={1} />
          <span className="eyebrow">{d.start.tag}</span>
        </div>
        <h1 className="h-display max-sm:break-words">{d.start.title}</h1>
        <p className="lead mt-6">{d.start.subtitle}</p>
      </div>
      <StartWizard
        locale={locale}
        strings={d.start}
        common={{ back: d.common.back, next: d.common.next, sending: d.common.sending }}
        messageLabel={d.contact.message}
        initialSegment={segment}
        utm={utm}
      />
    </section>
  );
}
