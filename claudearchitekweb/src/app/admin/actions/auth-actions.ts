"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_LANG_COOKIE, isAdminLocale } from "@/lib/i18n/admin";
import { login, logout, requestMeta, type LoginError } from "@/lib/auth";
import { safeNext } from "../login/next-url";

/**
 * `error` is a key, not a sentence: the login form prints it in the admin language (the action runs
 * before a dictionary is chosen). `email` comes back so a wrong password does not clear the field.
 */
export type LoginState = { error?: LoginError; retryAfterSec?: number; email?: string } | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").slice(0, 320);
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  const { ip, userAgent } = await requestMeta();
  const r = await login(email, password, { ip, userAgent });
  if (!r.ok) return { error: r.error, retryAfterSec: r.retryAfterSec, email };
  redirect(safeNext(next));
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
