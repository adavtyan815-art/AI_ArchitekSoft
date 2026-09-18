import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getAdminDict } from "@/lib/i18n/admin";
import { ThemeToggle } from "@/components/theme-toggle";
import { HtmlLang } from "@/components/site/html-lang";
import { LoginForm } from "./login-form";
import { safeNext } from "./next-url";
import { BrandLogo } from "@/components/brand-logo";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = safeNext(next);
  const user = await getSessionUser();
  // Already signed in: honour the link the visitor followed instead of always landing on the dashboard.
  if (user) redirect(target);
  const { t, locale } = await getAdminDict();
  const L =
    locale === "hy"
      ? {
          subtitle: "Կառավարման վահանակ",
          email: "Էլ. փոստ",
          password: "Գաղտնաբառ",
          submit: "Մուտք",
          pending: "Մուտք…",
          invalid: "Էլ. փոստը կամ գաղտնաբառը սխալ է։",
          locked: "Չափազանց շատ փորձ։ Կրկին փորձեք {min} րոպե հետո։",
        }
      : {
          subtitle: "Dashboard sign in",
          email: "Email",
          password: "Password",
          submit: "Sign in",
          pending: "Signing in…",
          invalid: "Invalid email or password.",
          locked: "Too many attempts. Try again in {min} min.",
        };
  // Deployment details (which file holds the first-boot credentials) are an internal note: they are
  // shown on the local development machine only, never on the public sign-in URL.
  const devHint = env.isProd
    ? null
    : locale === "hy"
      ? "Մշակման ռեժիմ։ Առաջին մուտքի տվյալները .env ֆայլում են։ Մուտքից հետո փոխեք գաղտնաբառը Կարգավորումներ → Անվտանգություն բաժնում։"
      : "Development mode. The first-boot credentials come from .env. Change the password in Settings → Security after signing in.";
  return (
    <div lang={locale} className="grid-paper flex min-h-dvh items-center justify-center bg-bg px-5 py-12">
      {/* <html lang> is set from the admin_lang cookie on a full load; correct it after a soft
          navigation in from the public site, which leaves the site's language on the element. */}
      <HtmlLang lang={locale} />
      <div className="absolute top-4 right-4">
        <ThemeToggle labels={t.theme} />
      </div>
      <div className="w-full max-w-[22rem]">
        <div className="mb-6 flex flex-col items-center">
          <BrandLogo className="h-7" />
          <div className="mt-4 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">{L.subtitle}</div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-6 shadow-lift">
          <LoginForm next={target} labels={L} />
        </div>
        {devHint ? <p className="caption mt-6 text-center leading-relaxed">{devHint}</p> : null}
      </div>
    </div>
  );
}
