"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createLiveInstance, stopLiveInstance } from "@/lib/live";

function back(text: string, tone: "ok" | "error" = "ok"): never {
  revalidatePath("/admin/live");
  redirect(`/admin/live?notice=${encodeURIComponent(text)}&tone=${tone}`);
}

export async function createLiveInstanceForm(formData: FormData) {
  await requireUser();
  const parsed = z
    .object({
      assignedTo: z.string().min(1).max(120),
      displayLimitHours: z.coerce.number().min(0.5).max(1000),
      realLimitHours: z.coerce.number().min(0.5).max(1000),
      days: z.coerce.number().int().min(1).max(3650),
      explicitInstanceId: z.string().max(80).optional(),
    })
    .safeParse({
      assignedTo: String(formData.get("assignedTo") ?? "").trim(),
      displayLimitHours: String(formData.get("displayLimitHours") ?? ""),
      realLimitHours: String(formData.get("realLimitHours") ?? ""),
      days: String(formData.get("days") ?? ""),
      explicitInstanceId: String(formData.get("explicitInstanceId") ?? "").trim() || undefined,
    });
  if (!parsed.success) back(`Invalid form: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`, "error");
  try {
    const r = await createLiveInstance(parsed.data);
    if (r.dryRun) back(`Dry-run (no LIVE_ADMIN_USERNAME/PASSWORD): the link would look like ${r.url}`, "error");
    back(`Instance ${r.uuid} created for ${parsed.data.assignedTo}. Link: ${r.url}`);
  } catch (e) {
    back(`Live backend error: ${(e as Error).message}`, "error");
  }
}

export async function stopLiveInstanceForm(formData: FormData) {
  await requireUser();
  const uuid = String(formData.get("uuid") ?? "");
  if (!uuid) back("Missing instance uuid.", "error");
  try {
    const r = await stopLiveInstance(uuid);
    back(r.ok ? `Stop requested for ${uuid}.` : `Could not stop ${uuid}: ${"error" in r ? r.error : "backend refused"}`, r.ok ? "ok" : "error");
  } catch (e) {
    back(`Live backend error: ${(e as Error).message}`, "error");
  }
}
