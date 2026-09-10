import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { env } from "@/lib/env";
import { ThemeToggle } from "@/components/theme-toggle";
import { ViewerDemo } from "@/components/site/viewer-demo";
import { QrPanel } from "@/components/portal/ar-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AR demo — ArchiTek Soft",
  description: "See a wardrobe in your room with augmented reality. Scan the QR code with your phone.",
  robots: { index: false, follow: false },
};

const COPY = {
  hy: {
    tag: "AR ցուցադրություն",
    title: "Տեսեք կահույքը Ձեր սենյակում",
    text: "Պտտեք մոդելը, փոխեք ֆասադի գույնը, ապա սկանավորեք QR կոդը հեռախոսով և տեղադրեք կահույքը Ձեր սենյակում իրական չափերով։ Աշխատում է iPhone-ի և Android-ի վրա, առանց հավելվածի։",
    note: "Սկանավորեք QR կոդը հեռախոսով կամ սեղմեք «Տեսնել իմ սենյակում» հեռախոսից։",
    missing: "Ցուցադրական մոդելը դեռ բեռնված չէ։",
    hint: "Քաշեք պտտելու համար • Ընտրեք գույնը ներքևում",
    swatches: "Ֆասադի գույն",
    ar: "Տեսնել իմ սենյակում",
    reset: "Վերականգնել դիտումը",
    theme: { light: "Բաց ռեժիմ", dark: "Մուգ ռեժիմ" },
  },
  ru: {
    tag: "AR-демо",
    title: "Посмотрите мебель в своей комнате",
    text: "Вращайте модель, меняйте цвет фасада, затем отсканируйте QR-код телефоном и поставьте мебель в своей комнате в реальном масштабе. Работает на iPhone и Android без приложения.",
    note: "Отсканируйте QR-код телефоном или нажмите «Посмотреть в моей комнате» с телефона.",
    missing: "Демонстрационная модель ещё не загружена.",
    hint: "Потяните, чтобы вращать • Выберите цвет ниже",
    swatches: "Цвет фасада",
    ar: "Посмотреть в моей комнате",
    reset: "Сбросить вид",
    theme: { light: "Светлая тема", dark: "Тёмная тема" },
  },
  en: {
    tag: "AR demo",
    title: "See the furniture in your room",
    text: "Rotate the model, change the front colour, then scan the QR code with your phone and place the furniture in your room at real scale. Works on iPhone and Android, no app needed.",
    note: "Scan the QR code with your phone, or tap “See in my room” from your phone.",
    missing: "The demo model is not uploaded yet.",
    hint: "Drag to rotate • Pick a colour below",
    swatches: "Front colour",
    ar: "See in my room",
    reset: "Reset the view",
    theme: { light: "Light mode", dark: "Dark mode" },
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
      // No #ar hash: the inline viewer has its own AR button, which the phone taps after landing here.
      qr = await QRCode.toDataURL(`${base}/demo/ar`, { margin: 1, width: 360, color: { dark: "#0b1220", light: "#ffffff" } });
    } catch {
      qr = null;
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="glass sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-5 sm:px-8">
          <a href="/" className="flex shrink-0 items-center gap-2.5" aria-label="ArchiTek Soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="ArchiTek Soft" className="h-7 w-auto dark:brightness-[1.35]" />
          </a>
          <div className="flex items-center gap-2">
            <span className="badge border-line bg-surface-2 text-fg-2">AR</span>
            <ThemeToggle labels={COPY.hy.theme} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-start">
          <div className="space-y-8">
            {(["hy", "ru", "en"] as const).map((l, i) => (
              <div key={l} lang={l} className={i === 0 ? "" : "border-t border-line pt-6"}>
                <div className="eyebrow mb-2">{COPY[l].tag}</div>
                <h2 className={i === 0 ? "h-section text-[2rem] sm:text-[2.5rem]" : "h-card text-xl"}>{COPY[l].title}</h2>
                <p className={i === 0 ? "lead mt-3" : "mt-2 text-sm leading-relaxed text-muted"}>{COPY[l].text}</p>
              </div>
            ))}
          </div>

          <div className="space-y-5">
            {modelUrl ? (
              <>
                <ViewerDemo src={modelUrl} labels={{ hint: COPY.hy.hint, swatches: COPY.hy.swatches, ar: COPY.hy.ar, reset: COPY.hy.reset }} height="h-[380px] sm:h-[480px]" />
                {qr ? (
                  <div className="flex justify-center">
                    <QrPanel qrDataUrl={qr} note={COPY.hy.note} />
                  </div>
                ) : null}
                <div className="card p-4 text-sm leading-relaxed text-muted sm:p-5">
                  <p lang="hy">{COPY.hy.note}</p>
                  <p lang="ru" className="mt-2">
                    {COPY.ru.note}
                  </p>
                  <p lang="en" className="mt-2">
                    {COPY.en.note}
                  </p>
                </div>
              </>
            ) : (
              <div className="card border-dashed p-10 text-center text-sm text-muted">
                <p lang="hy">{COPY.hy.missing}</p>
                <p lang="ru" className="mt-1">
                  {COPY.ru.missing}
                </p>
                <p lang="en" className="mt-1">
                  {COPY.en.missing}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-5xl px-5 py-6 text-xs text-muted sm:px-8">© {new Date().getFullYear()} ArchiTek Soft · KitchenPro</div>
      </footer>
    </div>
  );
}
