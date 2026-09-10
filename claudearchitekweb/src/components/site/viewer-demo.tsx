"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Box, RotateCcw, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Web Viewer demo: Google <model-viewer> + material swatches.
 * The GLB is loaded lazily (only when the section is near the viewport) to keep the page light.
 */
type Swatch = { id: string; label: string; hex?: string; original?: boolean };

type MVMaterial = {
  name: string;
  pbrMetallicRoughness: {
    setBaseColorFactor: (rgba: [number, number, number, number]) => void;
    setMetallicFactor?: (v: number) => void;
    setRoughnessFactor?: (v: number) => void;
    baseColorTexture: { texture: unknown; setTexture: (t: unknown) => void };
  };
};
type MVElement = HTMLElement & { model?: { materials: MVMaterial[] }; canActivateAR?: boolean; activateAR?: () => void; resetTurntableRotation?: () => void };

const DEFAULT_SWATCHES: Swatch[] = [
  { id: "wood", label: "Wood", original: true },
  { id: "white", label: "Matt white", hex: "#f2f0ea" },
  { id: "sand", label: "Sand", hex: "#cbb999" },
  { id: "sage", label: "Sage", hex: "#8b9a86" },
  { id: "navy", label: "Navy", hex: "#2c3a55" },
  { id: "graphite", label: "Graphite", hex: "#3a3c3f" },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  // sRGB → linear for a closer visual match
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
}

export function ViewerDemo({
  src = "/demo/closet_wardrobe.glb",
  poster,
  materialIndex = 1,
  swatches = DEFAULT_SWATCHES,
  labels,
  className,
  height = "h-[420px] sm:h-[520px]",
  autoload = false,
}: {
  src?: string;
  poster?: string;
  materialIndex?: number;
  swatches?: Swatch[];
  labels: { hint: string; swatches: string; ar: string; reset?: string; load?: string };
  className?: string;
  height?: string;
  autoload?: boolean;
}) {
  const ref = useRef<MVElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const original = useRef<unknown>(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(swatches.find((s) => s.original)?.id ?? swatches[0]?.id);
  const [canAr, setCanAr] = useState(false);

  // Loading strategy: the model (a few MB) is fetched automatically only on desktop-class devices
  // (fine pointer, no data-saver) when the section is near the viewport; phones get a tap-to-load
  // overlay so the page stays light on mobile networks. `autoload` forces immediate loading (viewer pages).
  useEffect(() => {
    if (autoload) {
      setNear(true);
      return;
    }
    const el = wrap.current;
    if (!el) return;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    const desktop = window.matchMedia("(pointer: fine)").matches && !nav.connection?.saveData;
    if (!desktop) return; // wait for a tap
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && (setNear(true), io.disconnect()), { rootMargin: "400px" });
    io.observe(el);
    const t = setTimeout(() => setNear(true), 4000); // hidden/background tabs never intersect
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, [autoload]);

  useEffect(() => {
    const mv = ref.current;
    if (!mv || !near) return;
    const onLoad = () => {
      const m = mv.model?.materials?.[materialIndex];
      if (m) original.current = m.pbrMetallicRoughness.baseColorTexture.texture;
      setReady(true);
      setCanAr(!!mv.canActivateAR);
    };
    mv.addEventListener("load", onLoad);
    return () => mv.removeEventListener("load", onLoad);
  }, [near, materialIndex]);

  const apply = (s: Swatch) => {
    setActive(s.id);
    const m = ref.current?.model?.materials?.[materialIndex];
    if (!m) return;
    if (s.original || !s.hex) {
      m.pbrMetallicRoughness.baseColorTexture.setTexture(original.current);
      m.pbrMetallicRoughness.setBaseColorFactor([1, 1, 1, 1]);
      m.pbrMetallicRoughness.setRoughnessFactor?.(0.6);
    } else {
      m.pbrMetallicRoughness.baseColorTexture.setTexture(null);
      const [r, g, b] = hexToRgb(s.hex);
      m.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1]);
      m.pbrMetallicRoughness.setRoughnessFactor?.(0.45);
      m.pbrMetallicRoughness.setMetallicFactor?.(0);
    }
  };

  return (
    <div ref={wrap} className={cn("card overflow-hidden", className)}>
      {near ? <Script src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js" type="module" strategy="lazyOnload" crossOrigin="anonymous" /> : null}
      <div className={cn("relative bg-surface-2", height)}>
        {near ? (
          <model-viewer
            ref={ref}
            src={src}
            poster={poster}
            alt="3D furniture model"
            camera-controls
            touch-action="pan-y"
            auto-rotate
            auto-rotate-delay="1500"
            rotation-per-second="12deg"
            shadow-intensity="0.7"
            exposure="1.05"
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="fixed"
            ar-placement="floor"
            loading="eager"
            reveal="auto"
            style={{ width: "100%", height: "100%", backgroundColor: "transparent", "--poster-color": "transparent" } as React.CSSProperties}
          />
        ) : null}
        {!near ? (
          <button type="button" onClick={() => setNear(true)} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-2">
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
            ) : null}
            <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-fg text-bg shadow-lift">
              <Box size={22} />
            </span>
            <span className="relative rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-fg shadow-soft">{labels.load ?? "3D"}</span>
          </button>
        ) : !ready ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full bg-surface/85 px-3 py-1.5 text-xs font-medium text-muted backdrop-blur">
              <Box size={14} className="animate-pulse" /> 3D
            </div>
          </div>
        ) : null}
        <div className="pointer-events-none absolute top-3 left-3 rounded-full bg-surface/85 px-3 py-1 text-[11px] font-medium text-fg-2 backdrop-blur">{labels.hint}</div>
        <div className="absolute top-3 right-3 flex gap-1.5">
          <button type="button" className="btn-secondary btn-icon h-8 w-8" aria-label={labels.reset ?? "Reset"} onClick={() => ref.current?.resetTurntableRotation?.()}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="kicker mb-2">{labels.swatches}</div>
          <div className="flex flex-wrap gap-2">
            {swatches.map((s) => (
              <button key={s.id} type="button" onClick={() => apply(s)} className={cn("flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs font-medium transition-colors", active === s.id ? "border-fg text-fg" : "border-line text-fg-2 hover:border-line-strong")} aria-pressed={active === s.id} disabled={!ready}>
                <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: s.hex ?? "linear-gradient(135deg,#b58a5b,#7a5a3a)" }} />
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className={cn("btn-soft shrink-0", !canAr && "hidden sm:inline-flex sm:opacity-60")} onClick={() => ref.current?.activateAR?.()} disabled={!canAr}>
          <Smartphone size={15} />
          {labels.ar}
        </button>
      </div>
    </div>
  );
}
