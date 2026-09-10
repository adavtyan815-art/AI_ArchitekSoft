"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
