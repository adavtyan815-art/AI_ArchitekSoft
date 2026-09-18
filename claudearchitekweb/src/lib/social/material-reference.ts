/**
 * Curated architecture/furniture material reference for the Palette Card's "Material Matcher": a
 * fixed table of common RAL Classic tones plus wood/stone/metal archetypes, each with a
 * representative hex. These are designer-reference approximations for labeling purposes — not a
 * licensed RAL conversion or a spectrophotometer reading — good enough to turn "#3B3E3A" into
 * "RAL 7016 — Anthracite Grey" for a caption, not a color-matching guarantee for production.
 *
 * Matching uses CIE76 Delta-E (RGB -> Lab, D65) rather than raw RGB distance: Lab space is built to
 * track *perceived* color difference, so it does not, for example, treat a small hue shift in a dark
 * tone as the same "distance" as an equally-sized shift in a light one the way naive RGB does.
 */
export type MaterialRef = { name: string; hex: string };

export const MATERIAL_REFERENCE: MaterialRef[] = [
  { name: "RAL 9010 — Pure White", hex: "#F1ECE1" },
  { name: "RAL 9016 — Traffic White", hex: "#F6F6F6" },
  { name: "RAL 1013 — Oyster White", hex: "#E9E5CE" },
  { name: "RAL 7044 — Silk Grey", hex: "#CBC6BC" },
  { name: "RAL 7035 — Light Grey", hex: "#D7D7D7" },
  { name: "RAL 7016 — Anthracite Grey", hex: "#383E42" },
  { name: "RAL 7021 — Black Grey", hex: "#2E3234" },
  { name: "RAL 9005 — Jet Black", hex: "#0A0A0A" },
  { name: "RAL 8019 — Grey Brown", hex: "#3D3635" },
  { name: "RAL 8022 — Black Brown", hex: "#231A1C" },
  { name: "RAL 1015 — Light Ivory", hex: "#E6D2B5" },
  { name: "RAL 8003 — Clay Brown", hex: "#7F4A12" },
  { name: "Natural Oak", hex: "#C8A165" },
  { name: "Smoked Walnut", hex: "#4A3324" },
  { name: "Warm Teak", hex: "#8A5A34" },
  { name: "Whitewashed Ash", hex: "#DCCFB8" },
  { name: "Brushed Brass", hex: "#B08D57" },
  { name: "Matte Black Metal", hex: "#1B1B1B" },
  { name: "Brushed Steel", hex: "#A8ACAE" },
  { name: "Calacatta Gold Marble", hex: "#E9E2D3" },
  { name: "Carrara White Marble", hex: "#EDEDEA" },
  { name: "Nero Marquina Marble", hex: "#1C1C1E" },
  { name: "Concrete Grey", hex: "#9C9791" },
  { name: "Terracotta", hex: "#A8562F" },
  { name: "Sand Beige", hex: "#C9B79C" },
  { name: "Sage Green", hex: "#8A9A82" },
  { name: "Deep Olive", hex: "#5B5F45" },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return { r: parseInt(clean.slice(0, 2), 16), g: parseInt(clean.slice(2, 4), 16), b: parseInt(clean.slice(4, 6), 16) };
}

type Lab = { l: number; a: number; b: number };

function rgbToLab({ r, g, b }: { r: number; g: number; b: number }): Lab {
  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 0.95047;
  const y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

function deltaE76(x: Lab, y: Lab): number {
  return Math.sqrt((x.l - y.l) ** 2 + (x.a - y.a) ** 2 + (x.b - y.b) ** 2);
}

const REFERENCE_LAB = MATERIAL_REFERENCE.map((m) => ({ ...m, lab: rgbToLab(hexToRgb(m.hex)) }));

/** deltaE76 above this is treated as "not actually close to anything in the table" — showing a name
 * anyway would claim a match that is not really there, which is worse than just showing the hex. */
const MAX_CONFIDENT_DISTANCE = 22;

export function nearestMaterial(hex: string): { name: string; hex: string; distance: number } | null {
  const lab = rgbToLab(hexToRgb(hex));
  let best: { name: string; hex: string; distance: number } | null = null;
  for (const ref of REFERENCE_LAB) {
    const d = deltaE76(lab, ref.lab);
    if (!best || d < best.distance) best = { name: ref.name, hex: ref.hex, distance: d };
  }
  return best && best.distance <= MAX_CONFIDENT_DISTANCE ? best : null;
}
