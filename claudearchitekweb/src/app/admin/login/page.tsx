import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAdminDict } from "@/lib/i18n/admin";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

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
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle labels={t.theme} />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="ArchiTek Soft" width={125} height={40} className="h-8 w-auto dark:brightness-[1.35]" />
          <div className="mt-3 text-sm text-muted">{L.subtitle}</div>
        </div>
        <div className="card p-6">
          <LoginForm next={next ?? "/admin"} labels={L} />
        </div>
        <p className="mt-6 text-center text-xs text-faint">{L.hint}</p>
      </div>
    </div>
  );
}
