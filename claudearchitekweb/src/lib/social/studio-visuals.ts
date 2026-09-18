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
import { nearestMaterial } from "./material-reference";

export const TARGET = { w: 1080, h: 1350 };
const FONT = "Arial, Helvetica, 'Noto Sans Armenian', sans-serif";
const PAPER = "#fbfaf7";
const INK = "#17150f";
const LINE_STRONG = "#b9b3a6";
const ACCENT = "#d9491f";
/** Studio signature fallback when no brand name is configured in Settings → Brand (see
 * lib/settings.ts's own DEFAULTS.brand.name, which this literally matches). */
const DEFAULT_STUDIO_NAME = "ArchiTek Soft";

function studioLine(studioName: string | undefined, withYear: boolean): string {
  const name = `${(studioName || DEFAULT_STUDIO_NAME).trim()} Studio`;
  return withYear ? `${name} | ${new Date().getFullYear()}` : name;
}

/** sharp's entropy-based smart crop: the templates deliberately fill their frame (unlike the
 * no-crop Smart Canvas elsewhere), so the interesting part of the photo should stay in frame. */
async function coverPng(absPath: string, w: number, h: number): Promise<Buffer> {
  return sharp(absPath, { failOn: "none" }).rotate().resize({ width: w, height: h, fit: "cover", position: "attention" }).png().toBuffer();
}

/** Fits the whole source inside the frame, padded rather than cropped — for a technical drawing,
 * cropping risks cutting off a dimension line or a title block, which a photo can afford to lose. */
async function containPng(absPath: string, w: number, h: number, background = "#ffffff"): Promise<Buffer> {
  return sharp(absPath, { failOn: "none" }).rotate().resize({ width: w, height: h, fit: "contain", background }).png().toBuffer();
}

async function flatten(base: Buffer, overlaySvg: string): Promise<Buffer> {
  return sharp(base)
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}

/** A rough but safe width estimate for a bold/tracked sans string, used only to size a background
 * pill or check whether a line needs wrapping — never to lay out glyphs precisely. `letterSpacing`
 * must match whatever the caller's actual `<text letter-spacing="...">` is: tracked all-caps labels
 * add up fast (18 gaps * 2.5px is 45px on a ~200px label) and an estimate that ignores it undersizes
 * the pill enough that the tail of the label lands past its dark background — invisible white-on-white. */
function textWidth(text: string, fontSize: number, factor = 0.6, letterSpacing = 0): number {
  return text.length * fontSize * factor + Math.max(0, text.length - 1) * letterSpacing;
}

/** Greedy word-wrap into at most `maxLines` lines that fit `maxWidth` at `fontSize`; whatever does
 * not fit is dropped from the last line and replaced with an ellipsis. `letterSpacing` must match the
 * caller's actual `<text letter-spacing="...">`, the same reason `textWidth` takes it. */
function wrapText(text: string, fontSize: number, maxWidth: number, maxLines: number, letterSpacing = 0): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let line = "";
  let consumedWords = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && textWidth(candidate, fontSize, undefined, letterSpacing) > maxWidth) {
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
    lines[lines.length - 1] = textWidth(`${last}…`, fontSize, undefined, letterSpacing) > maxWidth ? `${last.slice(0, Math.max(0, last.length - 1))}…` : `${last}…`;
  }
  return lines;
}

function tspans(lines: string[], x: number, firstY: number, lineHeight: number): string {
  return lines.map((l, i) => `<tspan x="${x}" y="${firstY + i * lineHeight}">${xmlText(l)}</tspan>`).join("");
}

// ---------------------------------------------------------------------------
// Template A — Editorial Cover Card
// ---------------------------------------------------------------------------
export async function generateEditorialCover(opts: { sourceAbsPath: string; title: string; materials?: string; studioName?: string }): Promise<Buffer> {
  const { w, h } = TARGET;
  const base = await coverPng(opts.sourceAbsPath, w, h);
  const titleLines = wrapText(opts.title || "", 58, w - 128, 2, -0.5);
  const materials = (opts.materials ?? "").trim();
  const materialsLine = materials ? wrapText(materials.toUpperCase(), 26, w - 128, 1, 2.5)[0] : "";

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
    <text x="${w - 64}" y="${h - 56}" text-anchor="end" font-family="${FONT}" font-weight="400" font-size="19" letter-spacing="2" fill="#ffffff" fill-opacity="0.62">${xmlText(studioLine(opts.studioName, true))}</text>
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

export async function generatePaletteCard(opts: { sourceAbsPath: string; colors?: string[]; studioName?: string }): Promise<Buffer> {
  const { w, h } = TARGET;
  const footerH = 230;
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
  const chipY = photoH + 56;
  // Material Matcher: label each swatch with the nearest curated reference name (e.g. "RAL 7016 —
  // Anthracite Grey") when it is a confident match, the hex underneath either way — a name the
  // extractor is not actually close to would be a false claim, so an unmatched swatch just shows hex.
  const chips = colors
    .map((hex, i) => {
      const segment = w / colors.length;
      const cx = segment * i + segment / 2;
      const x = cx - chipSize / 2;
      const match = nearestMaterial(hex);
      const primaryLabel = match ? match.name : hex;
      const secondaryLabel = match ? hex : "";
      return `
        <rect x="${x}" y="${chipY}" width="${chipSize}" height="${chipSize}" rx="16" fill="${xmlText(hex)}" stroke="${LINE_STRONG}" stroke-width="1"/>
        <text x="${cx}" y="${chipY + chipSize + 24}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="600" fill="${INK}" fill-opacity="0.82">${xmlText(primaryLabel)}</text>
        ${secondaryLabel ? `<text x="${cx}" y="${chipY + chipSize + 44}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="12" fill="${INK}" fill-opacity="0.55">${xmlText(secondaryLabel)}</text>` : ""}`;
    })
    .join("");

  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${photoH}" width="${w}" height="${footerH}" fill="${PAPER}"/>
    <rect x="0" y="${photoH}" width="${w}" height="1" fill="${LINE_STRONG}"/>
    <text x="${w / 2}" y="${photoH + 34}" text-anchor="middle" font-family="${FONT}" font-weight="600" font-size="14" letter-spacing="3" fill="#6b675e">MATERIAL PALETTE</text>
    ${chips}
    <text x="${w - 32}" y="${h - 18}" text-anchor="end" font-family="${FONT}" font-weight="400" font-size="13" letter-spacing="1.5" fill="#9a958a">${xmlText(studioLine(opts.studioName, false))}</text>
  </svg>`;
  return flatten(base, svg);
}

// ---------------------------------------------------------------------------
// Template C — Split Detail Card (Overview + Close-up)
// ---------------------------------------------------------------------------
function labelPill(text: string, x: number, y: number): string {
  const label = text.toUpperCase();
  const pillW = textWidth(label, 15, 0.66, 2.5) + 44;
  return `
    <rect x="${x}" y="${y}" width="${pillW}" height="40" rx="4" fill="${INK}" fill-opacity="0.55"/>
    <text x="${x + 22}" y="${y + 26}" font-family="${FONT}" font-weight="600" font-size="15" letter-spacing="2.5" fill="#ffffff">${xmlText(label)}</text>`;
}

export async function generateSplitDetail(opts: {
  wideAbsPath: string;
  detailAbsPath: string;
  wideLabel?: string;
  detailLabel?: string;
  studioName?: string;
}): Promise<Buffer> {
  const { w, h } = TARGET;
  const wideH = Math.round(h * 0.65);
  const dividerH = 2;
  const detailH = h - wideH - dividerH;

  const wide = await coverPng(opts.wideAbsPath, w, wideH);
  const detail = await coverPng(opts.detailAbsPath, w, detailH);
  // The gap left at the seam is filled with an explicit hairline in the overlay below, in its own
  // color — leaving it as the bare paper-colored canvas would make the divider vanish whenever the
  // photo right at that edge happens to already be pale.
  const composed = await sharp({ create: { width: w, height: h, channels: 3, background: PAPER } })
    .composite([
      { input: wide, top: 0, left: 0 },
      { input: detail, top: wideH + dividerH, left: 0 },
    ])
    .png()
    .toBuffer();

  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${wideH}" width="${w}" height="${dividerH}" fill="${LINE_STRONG}"/>
    ${labelPill(opts.wideLabel || "OVERVIEW", 32, 32)}
    ${labelPill(opts.detailLabel || "TEXTURE & JOINERY", 32, wideH + dividerH + 32)}
    <text x="${w - 32}" y="${h - 20}" text-anchor="end" font-family="${FONT}" font-weight="400" font-size="13" letter-spacing="1.5" fill="#ffffff" fill-opacity="0.75">${xmlText(studioLine(opts.studioName, false))}</text>
  </svg>`;
  return flatten(composed, svg);
}

// ---------------------------------------------------------------------------
// Template D — Process Card (2D Technical Draft -> 3D Photorealism)
// ---------------------------------------------------------------------------
/**
 * Stacks a 2D technical drawing (CAD floor plan, cut list, elevation — anything vector/line-based)
 * over the finished 3D render, 50/50, to show the studio's process end to end. The drawing is
 * letterboxed onto a plain white field with `contain` rather than smart-cropped: a CAD sheet often
 * carries dimension text or a title block right at its edges, and cropping that is a real content
 * loss in a way cropping a photo's background is not. The render below it uses the same smart-crop
 * as every other template, since it is a photo.
 */
export async function generateProcessCard(opts: {
  drawingAbsPath: string;
  renderAbsPath: string;
  drawingLabel?: string;
  renderLabel?: string;
  studioName?: string;
}): Promise<Buffer> {
  const { w, h } = TARGET;
  const topH = Math.round(h / 2);
  const dividerH = 2;
  const bottomH = h - topH - dividerH;

  const drawing = await containPng(opts.drawingAbsPath, w, topH, "#ffffff");
  const render = await coverPng(opts.renderAbsPath, w, bottomH);
  const composed = await sharp({ create: { width: w, height: h, channels: 3, background: PAPER } })
    .composite([
      { input: drawing, top: 0, left: 0 },
      { input: render, top: topH + dividerH, left: 0 },
    ])
    .png()
    .toBuffer();

  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${topH}" width="${w}" height="${dividerH}" fill="${LINE_STRONG}"/>
    ${labelPill(opts.drawingLabel || "2D TECHNICAL DRAFT", 32, 32)}
    ${labelPill(opts.renderLabel || "3D PHOTOREALISM", 32, topH + dividerH + 32)}
    <text x="${w - 32}" y="${h - 20}" text-anchor="end" font-family="${FONT}" font-weight="400" font-size="13" letter-spacing="1.5" fill="#ffffff" fill-opacity="0.75">${xmlText(studioLine(opts.studioName, false))}</text>
  </svg>`;
  return flatten(composed, svg);
}
