import type { Metadata } from "next";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { SectionHeading } from "@/components/ui";
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
    <section className="container-x pt-10 pb-16 sm:pt-14 sm:pb-24">
      <SectionHeading eyebrow={d.start.tag} title={d.start.title} text={d.start.subtitle} align="center" className="mb-10" />
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
