"use client";

import { useEffect, useRef, useState } from "react";
import { Box, RefreshCw, RotateCcw, Smartphone } from "lucide-react";
import { Swatch } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Web Viewer demo: an interactive 3D model on a dark stage with corner marks,
 * a mono toolbar and a material swatch bar.
 * The model is loaded lazily (only when the section is near the viewport) to keep the page light.
 * If the viewer library or the model cannot be loaded, the stage shows a localised message with a
 * retry control instead of a loader that never ends.
 */
export type SwatchItem = { id: string; label: string; hex?: string; original?: boolean };

/** Strings of the viewer. Every caller passes them from its dictionary. */
export type ViewerLabels = {
  hint: string;
  swatches: string;
  ar: string;
  reset: string;
  load?: string;
  /** Accessible name of the 3D model. */
  alt?: string;
  /** Shown while the model is being fetched. */
  loading?: string;
  /** Error state: message + retry control. */
  error?: string;
  retry?: string;
  /** Localised names of the swatches, keyed by swatch id. */
  swatchNames?: Record<string, string>;
};

type MVPbr = {
  baseColorFactor?: number[];
  roughnessFactor?: number;
  metallicFactor?: number;
  setBaseColorFactor: (rgba: [number, number, number, number]) => void;
  setMetallicFactor?: (v: number) => void;
  setRoughnessFactor?: (v: number) => void;
  baseColorTexture?: { texture: unknown; setTexture: (t: unknown) => void } | null;
};
type MVMaterial = { name: string; pbrMetallicRoughness: MVPbr };
type MVElement = HTMLElement & {
  model?: { materials: MVMaterial[] };
  loaded?: boolean;
  canActivateAR?: boolean;
  activateAR?: () => void;
  resetTurntableRotation?: () => void;
  jumpCameraToGoal?: () => void;
  cameraOrbit?: string;
  cameraTarget?: string;
  fieldOfView?: string;
  updateComplete?: Promise<unknown>;
};
/** What the material looked like when the model arrived, so "original" can restore it exactly. */
type SavedMaterial = { src: string; texture: unknown; color: [number, number, number, number]; roughness: number | null; metallic: number | null };

const WOOD = "linear-gradient(135deg,#b58a5b,#7a5a3a)";

const DEFAULT_SWATCHES: SwatchItem[] = [
  { id: "wood", label: "Wood", original: true },
  { id: "white", label: "Matt white", hex: "#f2f0ea" },
  { id: "sand", label: "Sand", hex: "#cbb999" },
  { id: "sage", label: "Sage", hex: "#8b9a86" },
  { id: "navy", label: "Navy", hex: "#2c3a55" },
  { id: "graphite", label: "Graphite", hex: "#3a3c3f" },
];

const LIB_SRC = "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js";
/** Give up when the library does not arrive, or when the model stops making progress, for this long. */
const LIB_TIMEOUT = 25_000;
const STALL_TIMEOUT = 30_000;

let libPromise: Promise<void> | null = null;
/**
 * Loads the viewer library once per page. A failed attempt is forgotten (and its script tag removed),
 * so the retry control really fetches it again.
 */
function loadViewerLib(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.customElements?.get("model-viewer")) return Promise.resolve();
  if (libPromise) return libPromise;
  libPromise = new Promise<void>((resolve, reject) => {
    let own: HTMLScriptElement | null = null;
    let timer = 0;
    const fail = (why: string) => {
      clearTimeout(timer);
      own?.remove();
      libPromise = null;
      reject(new Error(why));
    };
    timer = window.setTimeout(() => fail("timeout"), LIB_TIMEOUT);
    window.customElements.whenDefined("model-viewer").then(() => {
      clearTimeout(timer);
      resolve();
    });
    const start = () => {
      // another surface of the page may already have requested the same library
      if (document.querySelector(`script[src="${LIB_SRC}"]`)) return;
      own = document.createElement("script");
      own.type = "module";
      own.src = LIB_SRC;
      own.crossOrigin = "anonymous";
      own.addEventListener("error", () => fail("network"));
      document.head.appendChild(own);
    };
    // never compete with the first paint: wait for the page itself to finish loading
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  });
  return libPromise;
}

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
  iosSrc,
  labels,
  className,
  height = "h-[420px] sm:h-[520px]",
  autoload = false,
  defaultSwatch = "wood",
  cameraOrbit = "-28deg 82deg auto",
}: {
  src?: string;
  poster?: string;
  materialIndex?: number;
  /** Finishes offered under the stage. Pass an empty list for a client model: nothing is repainted. */
  swatches?: SwatchItem[];
  /** USDZ for AR Quick Look on iPhone/iPad (optional; without it the GLB is converted on the device). */
  iosSrc?: string;
  labels: ViewerLabels;
  className?: string;
  height?: string;
  autoload?: boolean;
  /** Swatch applied as soon as the model loads (a clean finish reads better than the sample texture). */
  defaultSwatch?: string;
  /** Initial camera: front view, slightly above eye level. */
  cameraOrbit?: string;
}) {
  const ref = useRef<MVElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const original = useRef<SavedMaterial | null>(null);
  const [near, setNear] = useState(false);
  const [lib, setLib] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState(defaultSwatch ?? swatches.find((s) => s.original)?.id ?? swatches[0]?.id);
  const [canAr, setCanAr] = useState(false);
  const hasSwatches = swatches.length > 0;

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

  // The viewer library. `attempt` re-runs this after a failure.
  useEffect(() => {
    if (!near) return;
    let alive = true;
    loadViewerLib().then(
      () => alive && setLib(true),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [near, attempt]);

  // The model: ready on "load", failed on "error" or when it stops making progress.
  useEffect(() => {
    const mv = ref.current;
    if (!mv || !near || !lib || failed) return;
    let stall = window.setTimeout(() => setFailed(true), STALL_TIMEOUT);
    const onProgress = () => {
      clearTimeout(stall);
      stall = window.setTimeout(() => setFailed(true), STALL_TIMEOUT);
    };
    const onLoad = () => {
      clearTimeout(stall);
      mv.removeEventListener("progress", onProgress);
      // a model with fewer materials than `materialIndex` simply has nothing to repaint
      const m = hasSwatches ? mv.model?.materials?.[materialIndex] : undefined;
      if (m && original.current?.src !== src) {
        const pbr = m.pbrMetallicRoughness;
        const c = pbr.baseColorFactor;
        original.current = {
          src,
          texture: pbr.baseColorTexture?.texture ?? null,
          color: c && c.length >= 3 ? [c[0], c[1], c[2], c[3] ?? 1] : [1, 1, 1, 1],
          roughness: typeof pbr.roughnessFactor === "number" ? pbr.roughnessFactor : null,
          metallic: typeof pbr.metallicFactor === "number" ? pbr.metallicFactor : null,
        };
      }
      setReady(true);
      setCanAr(!!mv.canActivateAR);
      const first = swatches.find((s) => s.id === defaultSwatch);
      if (m && first && !first.original) paint(m, first);
    };
    const onError = () => {
      clearTimeout(stall);
      setFailed(true);
    };
    mv.addEventListener("load", onLoad);
    mv.addEventListener("error", onError);
    mv.addEventListener("progress", onProgress);
    if (mv.loaded) onLoad(); // a cached model can be there before this effect runs
    return () => {
      clearTimeout(stall);
      mv.removeEventListener("load", onLoad);
      mv.removeEventListener("error", onError);
      mv.removeEventListener("progress", onProgress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, lib, failed, attempt, materialIndex, src]);

  const paint = (m: MVMaterial | undefined, s: SwatchItem) => {
    if (!m) return;
    const pbr = m.pbrMetallicRoughness;
    if (s.original || !s.hex) {
      // back to exactly what the model shipped with: texture, base colour, roughness, metalness
      const o = original.current;
      if (!o) return;
      pbr.baseColorTexture?.setTexture(o.texture);
      pbr.setBaseColorFactor(o.color);
      if (o.roughness !== null) pbr.setRoughnessFactor?.(o.roughness);
      if (o.metallic !== null) pbr.setMetallicFactor?.(o.metallic);
    } else {
      pbr.baseColorTexture?.setTexture(null);
      const [r, g, b] = hexToRgb(s.hex);
      pbr.setBaseColorFactor([r, g, b, 1]);
      pbr.setRoughnessFactor?.(0.45);
      pbr.setMetallicFactor?.(0);
    }
  };
  const apply = (s: SwatchItem) => {
    setActive(s.id);
    paint(ref.current?.model?.materials?.[materialIndex], s);
  };

  /** Back to the opening view: turntable, orbit, target and zoom. */
  const resetView = () => {
    const mv = ref.current;
    if (!mv) return;
    // Dragging does not change these properties, so assigning the same value would be ignored:
    // clear each one first, then set it again.
    mv.cameraOrbit = "";
    mv.cameraOrbit = cameraOrbit;
    mv.cameraTarget = "";
    mv.cameraTarget = "auto auto auto";
    mv.fieldOfView = "";
    mv.fieldOfView = "auto";
    mv.resetTurntableRotation?.();
    // the camera glides back; with reduced motion it is placed there at once
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      Promise.resolve(mv.updateComplete).then(() => mv.jumpCameraToGoal?.());
    }
  };

  const retry = () => {
    original.current = null;
    setFailed(false);
    setReady(false);
    setLib(!!window.customElements?.get("model-viewer"));
    setAttempt((a) => a + 1);
  };

  /** Mono toolbar button: square, hairline, readable on the dark stage. */
  const toolBtn =
    "inline-flex h-11 items-center gap-2 rounded-md border border-[#f4f2ed]/25 bg-[#17150f]/55 px-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#f4f2ed] backdrop-blur transition-colors hover:border-[#f4f2ed]/60 hover:bg-[#17150f]/75 disabled:opacity-40 sm:h-9";

  return (
    <div ref={wrap} className={cn("frame", className)}>
      <div className={cn("stage frame-marks on-image relative", height)}>
        {/* subtle grid-paper floor under the model */}
        <span aria-hidden className="grid-paper pointer-events-none absolute inset-x-0 bottom-0 h-2/5 opacity-40" />
        {near && lib && !failed ? (
          <model-viewer
            key={attempt}
            ref={ref}
            src={src}
            ios-src={iosSrc}
            poster={poster}
            alt={labels.alt ?? "3D"}
            camera-controls
            camera-orbit={cameraOrbit}
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
              <Box size={22} aria-hidden />
            </span>
            <span className="relative font-mono text-[11px] tracking-[0.12em] text-[#f4f2ed] uppercase">{labels.load ?? "3D"}</span>
          </button>
        ) : failed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" role="alert">
            {labels.error ? <p className="max-w-xs text-[14px] leading-snug text-[#f4f2ed]/85">{labels.error}</p> : null}
            <button type="button" className={toolBtn} onClick={retry}>
              <RefreshCw size={14} aria-hidden />
              {labels.retry ?? labels.reset}
            </button>
          </div>
        ) : !ready ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" role="status">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-[#f4f2ed]/70 uppercase">
              <Box size={14} className="animate-pulse" aria-hidden /> {labels.loading ?? "3D"}
            </span>
          </div>
        ) : null}

        {/* mono toolbar: hint · reset · AR */}
        {!failed ? (
          <div className="viewer-tools absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2 sm:inset-x-4 sm:bottom-4">
            <span className="hidden items-center rounded-md border border-[#f4f2ed]/20 bg-[#17150f]/55 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-[#f4f2ed]/80 backdrop-blur sm:inline-flex">{labels.hint}</span>
            <button type="button" className={toolBtn} onClick={resetView} disabled={!ready} aria-label={labels.reset}>
              <RotateCcw size={14} aria-hidden />
              <span className="hidden sm:inline">{labels.reset}</span>
            </button>
            <button type="button" className={cn(toolBtn, !canAr && "opacity-40")} onClick={() => ref.current?.activateAR?.()} disabled={!canAr}>
              <Smartphone size={14} aria-hidden />
              {labels.ar}
            </button>
          </div>
        ) : null}
      </div>

      {/* swatch bar: only for models whose finishes we know (a client's own model is never repainted) */}
      {hasSwatches ? (
        <div className="viewer-swatchbar flex flex-col gap-3 border-t border-line px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="caption flex-none sm:w-28">{labels.swatches}</div>
          {/* phones: one row that scrolls sideways, so long names never clip; from sm: wraps to the right */}
          <div role="group" aria-label={labels.swatches} className="viewer-swatches -mx-3.5 flex flex-1 items-start gap-x-2 overflow-x-auto px-3.5 py-1 sm:mx-0 sm:flex-wrap sm:justify-end sm:gap-x-3 sm:gap-y-3 sm:overflow-visible sm:px-0">
            {swatches.map((s) => (
              <Swatch key={s.id} hex={s.hex ?? WOOD} label={labels.swatchNames?.[s.id] ?? s.label} active={active === s.id} disabled={!ready || failed} onClick={() => apply(s)} className="flex-none disabled:opacity-45" />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
