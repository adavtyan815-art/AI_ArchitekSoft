"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { ADMIN_LANG_COOKIE, isAdminLocale } from "@/lib/i18n/admin";
import { login, logout } from "@/lib/auth";

export type LoginState = { error?: string } | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  const ua = (await headers()).get("user-agent") ?? undefined;
  const r = await login(email, password, ua);
  if (!r.ok) return { error: r.error };
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

export async function setAdminLangAction(formData: FormData) {
  const lang = String(formData.get("lang") ?? "hy");
  if (isAdminLocale(lang)) {
    (await cookies()).set(ADMIN_LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
}
