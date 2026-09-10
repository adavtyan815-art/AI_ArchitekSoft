import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { env } from "@/lib/env";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { ViewerDemo } from "@/components/site/viewer-demo";
import { QrPanel } from "@/components/portal/ar-button";
import { Index } from "@/components/ui";

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
      <header className="h-16 flex-none border-b border-line bg-surface">
        <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between gap-3 px-5 sm:px-8">
          <a href="/" className="flex shrink-0 items-center gap-3" aria-label="ArchiTek Soft">
            <BrandLogo className="h-7" />
          </a>
          <div className="flex items-center gap-3">
            <span className="tag">AR</span>
            <ThemeToggle labels={COPY.hy.theme} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <div className="mb-5 flex items-center gap-3">
              <Index n={1} />
              <span className="eyebrow">{COPY.hy.tag}</span>
            </div>
            <h1 className="h-display text-[2.2rem] sm:text-[2.8rem] lg:text-[3rem]">{COPY.hy.title}</h1>
            <p className="lead mt-6">{COPY.hy.text}</p>
            <div className="mt-10 divide-y divide-line border-y border-line">
              {(["ru", "en"] as const).map((l) => (
                <div key={l} lang={l} className="py-5">
                  <div className="kicker mb-2">{COPY[l].tag}</div>
                  <div className="font-display text-[1.2rem] leading-tight text-fg">{COPY[l].title}</div>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">{COPY[l].text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            {modelUrl ? (
              <>
                {/* Same stage treatment as the project viewer (ViewerDemo owns the dark
                    ground, dot-grid floor, corner marks, mono toolbar and swatch bar). */}
                <ViewerDemo src={modelUrl} labels={{ hint: COPY.hy.hint, swatches: COPY.hy.swatches, ar: COPY.hy.ar, reset: COPY.hy.reset }} height="h-[380px] sm:h-[520px]" />
                {qr ? (
                  <div className="mt-6 flex justify-center">
                    <QrPanel qrDataUrl={qr} note={COPY.hy.note} />
                  </div>
                ) : null}
                <div className="mt-6 divide-y divide-line border-y border-line">
                  {(["hy", "ru", "en"] as const).map((l) => (
                    <p key={l} lang={l} className="caption py-2.5">
                      {COPY[l].note}
                    </p>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid-paper border-y border-line px-6 py-20 text-center">
                {(["hy", "ru", "en"] as const).map((l, i) => (
                  <p key={l} lang={l} className={i === 0 ? "h-sub" : "caption mt-2"}>
                    {COPY[l].missing}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="caption mx-auto w-full max-w-5xl px-5 py-6 sm:px-8">© {new Date().getFullYear()} ArchiTek Soft · Web Viewer</div>
      </footer>
    </div>
  );
}
