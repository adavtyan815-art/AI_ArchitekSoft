"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Box, RotateCcw, Smartphone } from "lucide-react";
import { Swatch } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Web Viewer demo: Google <model-viewer> on a dark stage with corner marks,
 * a mono toolbar and a material swatch bar.
 * The GLB is loaded lazily (only when the section is near the viewport) to keep the page light.
 */
type SwatchItem = { id: string; label: string; hex?: string; original?: boolean };

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

const WOOD = "linear-gradient(135deg,#b58a5b,#7a5a3a)";

const DEFAULT_SWATCHES: SwatchItem[] = [
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
  swatches?: SwatchItem[];
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

  const apply = (s: SwatchItem) => {
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

  /** Mono toolbar button: square, hairline, readable on the dark stage. */
  const toolBtn =
    "inline-flex h-11 items-center gap-2 rounded-md border border-[#f4f2ed]/25 bg-[#17150f]/55 px-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#f4f2ed] backdrop-blur transition-colors hover:border-[#f4f2ed]/60 hover:bg-[#17150f]/75 disabled:opacity-40 sm:h-9";

  return (
    <div ref={wrap} className={cn("frame", className)}>
      {near ? <Script src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js" type="module" strategy="lazyOnload" crossOrigin="anonymous" /> : null}
      <div className={cn("stage frame-marks on-image relative", height)}>
        {/* subtle grid-paper floor under the model */}
        <span aria-hidden className="grid-paper pointer-events-none absolute inset-x-0 bottom-0 h-2/5 opacity-40" />
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
          <button type="button" onClick={() => setNear(true)} className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
            ) : null}
            <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-md border border-[#f4f2ed]/35 bg-[#17150f]/60 text-[#f4f2ed] backdrop-blur">
              <Box size={22} />
            </span>
            <span className="relative font-mono text-[11px] tracking-[0.12em] text-[#f4f2ed] uppercase">{labels.load ?? "3D"}</span>
          </button>
        ) : !ready ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-[#f4f2ed]/70 uppercase">
              <Box size={14} className="animate-pulse" /> 3D
            </span>
          </div>
        ) : null}

        {/* mono toolbar: hint · reset · AR */}
        <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2 sm:inset-x-4 sm:bottom-4">
          <span className="hidden items-center rounded-md border border-[#f4f2ed]/20 bg-[#17150f]/55 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-[#f4f2ed]/80 backdrop-blur sm:inline-flex">{labels.hint}</span>
          <button type="button" className={toolBtn} onClick={() => ref.current?.resetTurntableRotation?.()} aria-label={labels.reset ?? "Reset"}>
            <RotateCcw size={14} />
            <span className="hidden sm:inline">{labels.reset ?? "Reset"}</span>
          </button>
          <button type="button" className={cn(toolBtn, !canAr && "opacity-40")} onClick={() => ref.current?.activateAR?.()} disabled={!canAr}>
            <Smartphone size={14} />
            {labels.ar}
          </button>
        </div>
      </div>

      {/* swatch bar */}
      <div className="flex flex-col gap-3 border-t border-line px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="caption flex-none sm:w-28">{labels.swatches}</div>
        <div className="flex flex-1 flex-wrap items-start gap-x-4 gap-y-3 sm:justify-end">
          {swatches.map((s) => (
            <Swatch key={s.id} hex={s.hex ?? WOOD} label={s.label} active={active === s.id} disabled={!ready} onClick={() => apply(s)} className="disabled:opacity-45" />
          ))}
        </div>
      </div>
    </div>
  );
}
