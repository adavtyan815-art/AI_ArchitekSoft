import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect("/admin");
  const { next } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="ArchiTek Soft" className="h-8 w-auto" />
          <div className="mt-3 text-sm text-ink-500">Dashboard sign in</div>
        </div>
        <div className="card p-6">
          <LoginForm next={next ?? "/admin"} />
        </div>
        <p className="mt-6 text-center text-xs text-ink-400">Default credentials are in <code>.env</code> (ADMIN_EMAIL / ADMIN_PASSWORD). Change them after first login.</p>
      </div>
    </div>
  );
}
