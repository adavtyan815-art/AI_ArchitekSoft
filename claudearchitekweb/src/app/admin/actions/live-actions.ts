"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createLiveInstance, stopLiveInstance } from "@/lib/live";
import { getAdminLocale, local } from "@/lib/i18n/admin";

/** Notice wording for this action file. */
async function M() {
  const locale = await getAdminLocale();
  return local(
    {
      hy: {
        invalidForm: "Ձևը սխալ է լրացված՝",
        dryRun: "Փորձնական ռեժիմ (LIVE_ADMIN_USERNAME/PASSWORD չկա). հղումը կունենար այս տեսքը՝",
        created: "Սեսիան ստեղծված է",
        forWhom: "ում համար՝",
        linkWord: "Հղում՝",
        missingUuid: "Սեսիայի uuid-ն բացակայում է։",
        stopRequested: "Կանգնեցման հարցումն ուղարկված է՝",
        cannotStop: "Չհաջողվեց կանգնեցնել",
        refused: "սերվերը մերժեց",
        backendError: "Live սերվերի սխալ՝",
      },
      en: {
        invalidForm: "Invalid form:",
        dryRun: "Dry run (no LIVE_ADMIN_USERNAME/PASSWORD): the link would look like",
        created: "Session created",
        forWhom: "for",
        linkWord: "Link:",
        missingUuid: "Missing session uuid.",
        stopRequested: "Stop requested for",
        cannotStop: "Could not stop",
        refused: "backend refused",
        backendError: "Live backend error:",
      },
    },
    locale,
  );
}

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
  const m = await M();
  if (!parsed.success) back(`${m.invalidForm} ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`, "error");
  try {
    const r = await createLiveInstance(parsed.data);
    if (r.dryRun) back(`${m.dryRun} ${r.url}`, "error");
    back(`${m.created} (${r.uuid}) ${m.forWhom} ${parsed.data.assignedTo}. ${m.linkWord} ${r.url}`);
  } catch (e) {
    back(`${m.backendError} ${(e as Error).message}`, "error");
  }
}

export async function stopLiveInstanceForm(formData: FormData) {
  await requireUser();
  const uuid = String(formData.get("uuid") ?? "");
  const m = await M();
  if (!uuid) back(m.missingUuid, "error");
  try {
    const r = await stopLiveInstance(uuid);
    back(r.ok ? `${m.stopRequested} ${uuid}.` : `${m.cannotStop} ${uuid}: ${"error" in r ? r.error : m.refused}`, r.ok ? "ok" : "error");
  } catch (e) {
    back(`${m.backendError} ${(e as Error).message}`, "error");
  }
}
