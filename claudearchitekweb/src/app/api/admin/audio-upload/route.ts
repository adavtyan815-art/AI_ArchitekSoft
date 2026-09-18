/**
 * POST /api/admin/audio-upload — the SMM editor's "Upload Custom MP3" background-audio choice.
 * A thin, audio-only sibling of /api/admin/upload: same saveAsset() pipeline (so the file shows up
 * in the Media library, gets deleted with the rest of an asset's lifecycle, and respects the same
 * upload limit), but this route accepts nothing except a real MP3 — never the general allow-list —
 * so this specific control can never be used to smuggle another file type onto the server.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, MediaTypeError, mediaUrl, saveAsset, sniffMime } from "@/lib/media";
import { getAdminDict, local } from "@/lib/i18n/admin";
import { formatBytes } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sentences = (locale: "hy" | "en") =>
  local(
    {
      hy: {
        tooLarge: (max: string) => `Ֆայլը մեծ է ${max}-ից`,
        notMp3: "Միայն .mp3 ձայնագրություն է ընդունվում",
        contentMismatch: "Ֆայլի բովանդակությունը MP3 չէ",
      },
      en: {
        tooLarge: (max: string) => `File exceeds ${max}`,
        notMp3: "Only an .mp3 audio file is accepted",
        contentMismatch: "File content is not really an MP3",
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
  const file = form.get("file");
  if (!(typeof file === "object" && file !== null && "arrayBuffer" in file && (file as File).size > 0)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  const f = file as File;
  if (f.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: L.tooLarge(formatBytes(MAX_UPLOAD_BYTES)) }, { status: 400 });
  if (!/\.mp3$/i.test(f.name)) return NextResponse.json({ error: L.notMp3 }, { status: 400 });

  const buffer = Buffer.from(await f.arrayBuffer());
  if (sniffMime(buffer) !== "audio/mpeg") return NextResponse.json({ error: L.contentMismatch }, { status: 400 });

  try {
    const a = await saveAsset({ buffer, originalName: f.name, mime: "audio/mpeg", kindHint: "audio" });
    return NextResponse.json({ asset: { ...a, url: mediaUrl(a.relPath) } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof MediaTypeError ? L.contentMismatch : (e as Error).message }, { status: 400 });
  }
}
