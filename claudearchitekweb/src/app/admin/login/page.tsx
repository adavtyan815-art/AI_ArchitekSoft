import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAdminDict } from "@/lib/i18n/admin";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";
import { BrandLogo } from "@/components/brand-logo";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect("/admin");
  const { next } = await searchParams;
  const { t, locale } = await getAdminDict();
  const L = locale === "hy"
    ? { subtitle: "Կառավարման վահանակ", email: "Էլ. փոստ", password: "Գաղտնաբառ", submit: "Մուտք", pending: "Մուտք…", hint: "Առաջին մուտքի տվյալները .env ֆայլում են (ADMIN_EMAIL / ADMIN_PASSWORD)։ Մուտքից հետո փոխեք գաղտնաբառը Կարգավորումներ → Անվտանգություն բաժնում։" }
    : { subtitle: "Dashboard sign in", email: "Email", password: "Password", submit: "Sign in", pending: "Signing in…", hint: "First-login credentials are in .env (ADMIN_EMAIL / ADMIN_PASSWORD). Change the password in Settings → Security after signing in." };
  return (
    <div className="grid-paper flex min-h-dvh items-center justify-center bg-bg px-5 py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle labels={t.theme} />
      </div>
      <div className="w-full max-w-[22rem]">
        <div className="mb-6 flex flex-col items-center">
          <BrandLogo className="h-7" />
          <div className="mt-4 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">{L.subtitle}</div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-6 shadow-lift">
          <LoginForm next={next ?? "/admin"} labels={L} />
        </div>
        <p className="caption mt-6 text-center leading-relaxed">{L.hint}</p>
      </div>
    </div>
  );
}
