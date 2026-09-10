import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { env } from "@/lib/env";
import { ArButton } from "@/components/portal/ar-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AR demo — ArchiTek Soft",
  description: "See a wardrobe in your room with augmented reality. Scan the QR code with your phone.",
};

const COPY = {
  hy: {
    tag: "AR ցուցադրություն",
    title: "Տեսեք կահույքը Ձեր սենյակում",
    text: "Սկանավորեք QR կոդը հեռախոսով, սեղմեք «Տեսնել իմ սենյակում» և տեղադրեք 3D մոդելը իրական չափերով։ Աշխատում է iPhone-ի և Android-ի վրա, առանց հավելվածի։",
    button: "Տեսնել իմ սենյակում (AR)",
    note: "Սկանավորեք QR կոդը հեռախոսով կամ սեղմեք հեռախոսից։",
    missing: "Ցուցադրական մոդելը դեռ բեռնված չէ։",
  },
  ru: {
    tag: "AR-демо",
    title: "Посмотрите мебель в своей комнате",
    text: "Отсканируйте QR-код телефоном, нажмите «Посмотреть в моей комнате» и поставьте 3D-модель в реальном масштабе. Работает на iPhone и Android без приложения.",
    button: "Посмотреть в моей комнате (AR)",
    note: "Отсканируйте QR-код телефоном или нажмите с телефона.",
    missing: "Демонстрационная модель ещё не загружена.",
  },
  en: {
    tag: "AR demo",
    title: "See the furniture in your room",
    text: "Scan the QR code with your phone, tap “See in my room” and place the 3D model at real scale. Works on iPhone and Android, no app needed.",
    button: "See in my room (AR)",
    note: "Scan the QR code with your phone, or tap from your phone.",
    missing: "The demo model is not uploaded yet.",
  },
} as const;

const MODEL_REL = "demo/closet_wardrobe.glb";

export default async function ArDemoPage() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? (env.isProd ? "https" : "http");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base = host ? `${proto}://${host}` : env.appUrl;
  const modelExists = fs.existsSync(path.join(process.cwd(), "public", MODEL_REL));
  const modelUrl = modelExists ? `/${MODEL_REL}` : null;
  let qr: string | null = null;
  if (modelExists) {
    try {
      qr = await QRCode.toDataURL(`${base}/demo/ar#ar`, { margin: 1, width: 360, color: { dark: "#0b1220", light: "#ffffff" } });
    } catch {
      qr = null;
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
          <a href="/" className="flex items-center gap-2.5" aria-label="ArchiTek Soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="ArchiTek Soft" className="h-7 w-auto" />
          </a>
          <span className="badge border-ink-200 bg-white text-ink-700">AR</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <div className="space-y-8">
            {(["hy", "ru", "en"] as const).map((l, i) => (
              <div key={l} lang={l} className={i === 0 ? "" : "border-t border-line pt-6"}>
                <div className="eyebrow mb-2">{COPY[l].tag}</div>
                <h2 className={i === 0 ? "text-3xl font-semibold leading-tight tracking-tight text-ink-950 sm:text-4xl" : "text-xl font-semibold tracking-tight text-ink-950"}>{COPY[l].title}</h2>
                <p className={i === 0 ? "mt-3 text-lg leading-relaxed text-ink-600" : "mt-2 text-sm leading-relaxed text-ink-600"}>{COPY[l].text}</p>
              </div>
            ))}
          </div>

          <div className="card p-4 sm:p-6">
            {modelUrl ? (
              <ArButton inline glbUrl={modelUrl} qrDataUrl={qr} label={COPY.hy.button} note={`${COPY.hy.note} · ${COPY.en.note}`} />
            ) : (
              <div className="rounded-2xl border border-dashed border-ink-300 bg-ink-50 p-10 text-center text-sm text-ink-500">
                {COPY.hy.missing}
                <br />
                {COPY.ru.missing}
                <br />
                {COPY.en.missing}
              </div>
            )}
            {modelUrl ? (
              <p className="mt-4 text-sm text-ink-500">
                {COPY.hy.note}
                <br />
                {COPY.ru.note}
                <br />
                {COPY.en.note}
              </p>
            ) : null}
          </div>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-5xl px-5 py-6 text-xs text-ink-500 sm:px-8">© {new Date().getFullYear()} ArchiTek Soft · KitchenPro</div>
      </footer>
    </div>
  );
}
