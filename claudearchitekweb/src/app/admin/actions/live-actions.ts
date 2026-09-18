"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createLiveInstance, stopLiveInstance } from "@/lib/live";
import { adminDict, getAdminLocale, local } from "@/lib/i18n/admin";
import { issueMessage, parseNumber, withNotice } from "@/lib/form";

/** Notice wording for this action file. */
async function M() {
  const locale = await getAdminLocale();
  const words = local(
    {
      hy: {
        dryRun: "Փորձնական ռեժիմ (LIVE_ADMIN_USERNAME/PASSWORD չկա). սեսիա չի ստեղծվել, հղումը կունենար այս տեսքը՝",
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
        dryRun: "Dry run (no LIVE_ADMIN_USERNAME/PASSWORD): no session was created, the link would look like",
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
  return { ...words, locale, form: adminDict(locale).live.form };
}

function back(text: string, tone: "ok" | "error" = "ok"): never {
  revalidatePath("/admin/live");
  redirect(withNotice("/admin/live", text, tone));
}

/** "4,5" and "4.5" are both hours; anything that is not a number becomes NaN so zod reports the field. */
const hours = (fd: FormData, key: string) => {
  const raw = String(fd.get(key) ?? "").trim();
  return raw ? (parseNumber(raw) ?? Number.NaN) : Number.NaN;
};

export async function createLiveInstanceForm(formData: FormData) {
  await requireUser();
  const parsed = z
    .object({
      assignedTo: z.string().min(1).max(120),
      displayLimitHours: z.number().min(0.5).max(1000),
      realLimitHours: z.number().min(0.5).max(1000),
      days: z.number().int().min(1).max(3650),
      explicitInstanceId: z.string().max(80).optional(),
    })
    .safeParse({
      assignedTo: String(formData.get("assignedTo") ?? "").trim(),
      displayLimitHours: hours(formData, "displayLimitHours"),
      realLimitHours: hours(formData, "realLimitHours"),
      days: hours(formData, "days"),
      explicitInstanceId: String(formData.get("explicitInstanceId") ?? "").trim() || undefined,
    });
  const m = await M();
  if (!parsed.success) {
    const labels = { assignedTo: m.form.assignedTo, displayLimitHours: m.form.displayLimit, realLimitHours: m.form.realLimit, days: m.form.days, explicitInstanceId: m.form.instanceId };
    back(issueMessage(parsed.error.issues[0], labels, m.locale), "error");
  }

  // Only the backend call sits inside try/catch: back() redirects by throwing NEXT_REDIRECT, which must never be caught here.
  let result: Awaited<ReturnType<typeof createLiveInstance>> | null = null;
  let failure = "";
  try {
    result = await createLiveInstance(parsed.data);
  } catch (e) {
    failure = (e as Error).message || "unknown";
  }
  if (!result) back(`${m.backendError} ${failure}`, "error");
  if (result.dryRun) back(`${m.dryRun} ${result.url}`, "error");
  back(`${m.created} (${result.uuid}) ${m.forWhom} ${parsed.data.assignedTo}. ${m.linkWord} ${result.url}`);
}

export async function stopLiveInstanceForm(formData: FormData) {
  await requireUser();
  const uuid = String(formData.get("uuid") ?? "").trim().slice(0, 120);
  const m = await M();
  if (!uuid) back(m.missingUuid, "error");

  let result: Awaited<ReturnType<typeof stopLiveInstance>> | null = null;
  let failure = "";
  try {
    result = await stopLiveInstance(uuid);
  } catch (e) {
    failure = (e as Error).message || "unknown";
  }
  if (!result) back(`${m.backendError} ${failure}`, "error");
  if (result.ok) back(`${m.stopRequested} ${uuid}.`);
  back(`${m.cannotStop} ${uuid}: ${"error" in result && result.error ? result.error : m.refused}`, "error");
}
