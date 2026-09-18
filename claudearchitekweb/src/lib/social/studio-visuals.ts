/**
 * Studio Visual Layouts: three static 4:5 (1080x1350) graphics composed from a post's own photos
 * with sharp + SVG — no external design software. Every template shares the same shape (load a
 * source photo, smart-crop it with sharp, composite a crisp SVG overlay for the typographic chrome,
 * flatten to JPEG) and the same restrained Atelier palette (paper, ink, one warm accent, hairlines
 * instead of shadows). Callers resolve asset paths with `absPath()` before calling in — this module
 * knows nothing about the database.
 *
 * Text stays on the same safe font stack `lib/media.ts`'s poster generator already proved renders
 * Armenian correctly under sharp/librsvg (`Arial, Helvetica, 'Noto Sans Armenian', sans-serif`); the
 * "serif display / grotesk body" hierarchy the Atelier system describes is achieved with weight,
 * size and letter-spacing instead of a second typeface, since the brand's actual display serif
 * (Source Serif 4 / Noto Serif Armenian) is self-hosted for the browser, not installed as a system
 * font for a headless render — substituting an unverified serif fallback risks silently dropping
 * Armenian glyphs, which is worse than not having a serif at all.
 */
import sharp from "sharp";
import { xmlText } from "../media";

export const TARGET = { w: 1080, h: 1350 };
const FONT = "Arial, Helvetica, 'Noto Sans Armenian', sans-serif";
const PAPER = "#fbfaf7";
const INK = "#17150f";
const LINE_STRONG = "#b9b3a6";
const ACCENT = "#d9491f";

/** sharp's entropy-based smart crop: the templates deliberately fill their frame (unlike the
 * no-crop Smart Canvas elsewhere), so the interesting part of the photo should stay in frame. */
async function coverPng(absPath: string, w: number, h: number): Promise<Buffer> {
  return sharp(absPath, { failOn: "none" }).rotate().resize({ width: w, height: h, fit: "cover", position: "attention" }).png().toBuffer();
}

async function flatten(base: Buffer, overlaySvg: string): Promise<Buffer> {
  return sharp(base)
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}

/** A rough but safe width estimate for a bold/tracked sans string, used only to size a background
 * pill or check whether a line needs wrapping — never to lay out glyphs precisely. */
function textWidth(text: string, fontSize: number, factor = 0.58): number {
  return text.length * fontSize * factor;
}

/** Greedy word-wrap into at most `maxLines` lines that fit `maxWidth` at `fontSize`; whatever does
 * not fit is dropped from the last line and replaced with an ellipsis. */
function wrapText(text: string, fontSize: number, maxWidth: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let line = "";
  let consumedWords = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && textWidth(candidate, fontSize) > maxWidth) {
      lines.push(line);
      consumedWords += line.split(/\s+/).length;
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (lines.length < maxLines && line) {
    lines.push(line);
    consumedWords += line.split(/\s+/).length;
  }
  if (consumedWords < words.length) {
    const last = lines[lines.length - 1] ?? "";
    lines[lines.length - 1] = textWidth(`${last}…`, fontSize) > maxWidth ? `${last.slice(0, Math.max(0, last.length - 1))}…` : `${last}…`;
  }
  return lines;
}

function tspans(lines: string[], x: number, firstY: number, lineHeight: number): string {
  return lines.map((l, i) => `<tspan x="${x}" y="${firstY + i * lineHeight}">${xmlText(l)}</tspan>`).join("");
}

// ---------------------------------------------------------------------------
// Template A — Editorial Cover Card
// ---------------------------------------------------------------------------
export async function generateEditorialCover(opts: { sourceAbsPath: string; title: string; materials?: string }): Promise<Buffer> {
  const { w, h } = TARGET;
  const base = await coverPng(opts.sourceAbsPath, w, h);
  const year = new Date().getFullYear();
  const titleLines = wrapText(opts.title || "", 58, w - 128, 2);
  const materials = (opts.materials ?? "").trim();
  const materialsLine = materials ? wrapText(materials.toUpperCase(), 26, w - 128, 1)[0] : "";

  const gradientTop = h - (materialsLine ? 470 : 410);
  const ruleY = gradientTop + 96;
  const titleFirstY = ruleY + 64;
  const titleLineHeight = 66;
  const materialsY = titleFirstY + (titleLines.length - 1) * titleLineHeight + (materialsLine ? 54 : 0);

  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${INK}" stop-opacity="0"/>
        <stop offset="55%" stop-color="${INK}" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="${INK}" stop-opacity="0.92"/>
      </linearGradient>
    </defs>
    <rect x="0" y="${gradientTop}" width="${w}" height="${h - gradientTop}" fill="url(#vignette)"/>
    <rect x="64" y="${ruleY - 30}" width="96" height="3" fill="${ACCENT}"/>
    <text font-family="${FONT}" font-weight="700" font-size="58" fill="#ffffff" letter-spacing="-0.5">
      ${tspans(titleLines, 64, titleFirstY, titleLineHeight)}
    </text>
    ${materialsLine ? `<text x="64" y="${materialsY}" font-family="${FONT}" font-weight="500" font-size="26" letter-spacing="2.5" fill="#e9e4da" fill-opacity="0.92">${xmlText(materialsLine)}</text>` : ""}
    <text x="${w - 64}" y="${h - 56}" text-anchor="end" font-family="${FONT}" font-weight="400" font-size="19" letter-spacing="2" fill="#ffffff" fill-opacity="0.62">ArchiTek Soft Studio | ${year}</text>
  </svg>`;
  return flatten(base, svg);
}

// ---------------------------------------------------------------------------
// Template B — Color & Material Palette Card
// ---------------------------------------------------------------------------
function toHex(v: { r: number; g: number; b: number }): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(v.r)}${c(v.g)}${c(v.b)}`.toUpperCase();
}

/**
 * Naive but effective dominant-color extraction: downsample, quantize every pixel to a coarse RGB
 * grid, keep the most frequent buckets whose averaged color is visually distinct from what is
 * already chosen (plain city-block distance), and pad from the remaining buckets — relaxing the
 * distance requirement — if the source is too close to monochrome to yield 4 distinct tones on the
 * first pass. No extra dependency: this is exactly what a lightweight "get dominant colors" library
 * would do, just inlined.
 */
export async function extractDominantColors(absPath: string, count = 4): Promise<string[]> {
  const { data, info } = await sharp(absPath, { failOn: "none" })
    .rotate()
    .resize(120, 120, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const STEP = 24;
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i + channels <= data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = `${Math.round(r / STEP)},${Math.round(g / STEP)},${Math.round(b / STEP)}`;
    const entry = buckets.get(key);
    if (entry) {
      entry.r += r;
      entry.g += g;
      entry.b += b;
      entry.n += 1;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).map((c) => ({ r: c.r / c.n, g: c.g / c.n, b: c.b / c.n }));
  const distance = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);

  const chosen: { r: number; g: number; b: number }[] = [];
  for (const threshold of [60, 30, 0]) {
    for (const c of sorted) {
      if (chosen.length >= count) break;
      if (chosen.some((s) => distance(s, c) < threshold)) continue;
      if (chosen.some((s) => s.r === c.r && s.g === c.g && s.b === c.b)) continue;
      chosen.push(c);
    }
    if (chosen.length >= count) break;
  }
  return chosen.slice(0, count).map(toHex);
}

export async function generatePaletteCard(opts: { sourceAbsPath: string; colors?: string[] }): Promise<Buffer> {
  const { w, h } = TARGET;
  const footerH = 210;
  const photoH = h - footerH;
  const photo = await coverPng(opts.sourceAbsPath, w, photoH);
  // The overlay SVG below spans the full 1080x1350 card (it also draws the paper footer band), so the
  // photo — only photoH tall — is first laid onto a full-height canvas before that overlay composites.
  const base = await sharp({ create: { width: w, height: h, channels: 3, background: PAPER } })
    .composite([{ input: photo, top: 0, left: 0 }])
    .png()
    .toBuffer();
  const colors = (opts.colors && opts.colors.length ? opts.colors : await extractDominantColors(opts.sourceAbsPath)).slice(0, 4);
  while (colors.length < 4) colors.push("#D9D4C8");

  const chipSize = 84;
  const chipY = photoH + 58;
  const chips = colors
    .map((hex, i) => {
      const segment = w / colors.length;
      const cx = segment * i + segment / 2;
      const x = cx - chipSize / 2;
      return `
        <rect x="${x}" y="${chipY}" width="${chipSize}" height="${chipSize}" rx="16" fill="${xmlText(hex)}" stroke="${LINE_STRONG}" stroke-width="1"/>
        <text x="${cx}" y="${chipY + chipSize + 30}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="15" font-weight="500" fill="${INK}" fill-opacity="0.72">${xmlText(hex)}</text>`;
    })
    .join("");

  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${photoH}" width="${w}" height="${footerH}" fill="${PAPER}"/>
    <rect x="0" y="${photoH}" width="${w}" height="1" fill="${LINE_STRONG}"/>
    <text x="${w / 2}" y="${photoH + 36}" text-anchor="middle" font-family="${FONT}" font-weight="600" font-size="14" letter-spacing="3" fill="#6b675e">MATERIAL PALETTE</text>
    ${chips}
    <text x="${w - 32}" y="${h - 18}" text-anchor="end" font-family="${FONT}" font-weight="400" font-size="13" letter-spacing="1.5" fill="#9a958a">ArchiTek Soft</text>
  </svg>`;
  return flatten(base, svg);
}

// ---------------------------------------------------------------------------
// Template C — Split Detail Card (Overview + Close-up)
// ---------------------------------------------------------------------------
function labelPill(text: string, x: number, y: number): string {
  const label = text.toUpperCase();
  const pillW = textWidth(label, 15, 0.62) + 40;
  return `
    <rect x="${x}" y="${y}" width="${pillW}" height="40" rx="4" fill="${INK}" fill-opacity="0.55"/>
    <text x="${x + 20}" y="${y + 26}" font-family="${FONT}" font-weight="600" font-size="15" letter-spacing="2.5" fill="#ffffff">${xmlText(label)}</text>`;
}

export async function generateSplitDetail(opts: {
  wideAbsPath: string;
  detailAbsPath: string;
  wideLabel?: string;
  detailLabel?: string;
}): Promise<Buffer> {
  const { w, h } = TARGET;
  const wideH = Math.round(h * 0.65);
  const dividerH = 2;
  const detailH = h - wideH - dividerH;

  const wide = await coverPng(opts.wideAbsPath, w, wideH);
  const detail = await coverPng(opts.detailAbsPath, w, detailH);
  // The base canvas is already paper-colored, so the untouched dividerH gap between the two photos
  // becomes the hairline on its own — nothing extra to draw.
  const composed = await sharp({ create: { width: w, height: h, channels: 3, background: PAPER } })
    .composite([
      { input: wide, top: 0, left: 0 },
      { input: detail, top: wideH + dividerH, left: 0 },
    ])
    .png()
    .toBuffer();

  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    ${labelPill(opts.wideLabel || "OVERVIEW", 32, 32)}
    ${labelPill(opts.detailLabel || "TEXTURE & JOINERY", 32, wideH + dividerH + 32)}
    <text x="${w - 32}" y="${h - 20}" text-anchor="end" font-family="${FONT}" font-weight="400" font-size="13" letter-spacing="1.5" fill="#ffffff" fill-opacity="0.75">ArchiTek Soft Studio</text>
  </svg>`;
  return flatten(composed, svg);
}
