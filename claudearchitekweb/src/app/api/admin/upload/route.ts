/**
 * POST /api/admin/upload — multipart upload for the admin media library and project media tabs.
 * Fields: files (one or many), projectId?, kindHint?  Returns the saved asset rows with URLs.
 *
 * Per-file messages and the timeline entry follow the admin interface language, like every other
 * message the dashboard produces.
 */
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { MAX_UPLOAD_BYTES, MediaTypeError, isAllowed, mediaUrl, saveAsset } from "@/lib/media";
import { logActivity } from "@/lib/crm";
import { getAdminDict, local } from "@/lib/i18n/admin";
import { formatBytes } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sentences = (locale: "hy" | "en") =>
  local(
    {
      hy: {
        tooLarge: (max: string) => `Ֆայլը մեծ է ${max}-ից`,
        notAllowed: "Այս տեսակի ֆայլը չի ընդունվում",
        contentMismatch: "Ֆայլի բովանդակությունը չի համապատասխանում իր տեսակին",
        uploaded: (n: number, names: string) => `Վերբեռնվեց ${n} ֆայլ՝ ${names}`,
      },
      en: {
        tooLarge: (max: string) => `File exceeds ${max}`,
        notAllowed: "File type not allowed",
        contentMismatch: "File content does not match its type",
        uploaded: (n: number, names: string) => `Uploaded ${n} file(s): ${names}`,
      },
    },
    locale
  );

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { locale } = await getAdminDict();
  const L = sentences(locale);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }
  const files = form.getAll("files").filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f && (f as File).size > 0);
  if (!files.length) return NextResponse.json({ error: "No files" }, { status: 400 });

  const projectId = String(form.get("projectId") ?? "").trim() || null;
  const kindHint = String(form.get("kindHint") ?? "").trim() || undefined;
  const db = getDb();
  if (projectId) {
    const p = db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.id, projectId)).get();
    if (!p) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const saved: Array<Record<string, unknown>> = [];
  const errors: { name: string; error: string }[] = [];
  for (const f of files) {
    if (f.size > MAX_UPLOAD_BYTES) {
      errors.push({ name: f.name, error: L.tooLarge(formatBytes(MAX_UPLOAD_BYTES)) });
      continue;
    }
    // The browser declares the type; the allow-list and saveAsset check the extension and the bytes.
    const mime = f.type || "application/octet-stream";
    if (!isAllowed(mime, f.name)) {
      errors.push({ name: f.name, error: L.notAllowed });
      continue;
    }
    try {
      const buffer = Buffer.from(await f.arrayBuffer());
      const a = await saveAsset({ buffer, originalName: f.name, mime, kindHint, projectId });
      saved.push({ ...a, url: mediaUrl(a.relPath), thumbUrl: a.thumbRelPath ? mediaUrl(a.thumbRelPath) : null });
    } catch (e) {
      errors.push({ name: f.name, error: e instanceof MediaTypeError ? L.contentMismatch : (e as Error).message });
    }
  }
  if (projectId && saved.length) logActivity("project", projectId, L.uploaded(saved.length, saved.map((a) => String(a.originalName)).join(", ").slice(0, 300)), "system", user.id);
  return NextResponse.json({ assets: saved, errors }, { status: saved.length ? 200 : 400 });
}
