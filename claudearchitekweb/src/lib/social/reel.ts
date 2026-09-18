/**
 * Cinematic Reel: turns a post's photos into a single 9:16 slideshow video — "Architectural Studio
 * Quality" per the brief. Every photo is first run through the Smart Canvas (lib/social/canvas.ts,
 * mode "story_9_16") so a 16:9 render, a square AI image or a 4:3 photo all land on the exact same
 * 1080x1920 frame with nothing cropped, then held for a few seconds with a slow Ken Burns zoom
 * (ffmpeg's `zoompan`, 1.00 -> 1.05) and cross-dissolved into the next slide (`xfade`). The operator's
 * chosen background-audio track, if any, is mixed under the whole thing, trimmed or looped to length.
 *
 * One ffmpeg invocation builds the entire filtergraph and writes a temp .mp4; the caller reads that
 * file and hands the bytes to lib/media.ts's `saveAsset`, so the result becomes an ordinary video
 * asset — same thumbnail/duration probing, same media-library entry, same HTML5 player — as anything
 * a human uploaded.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { ensureCanvasVariant } from "./canvas";
import type { Asset } from "../db/schema";

const FPS = 30;
/** How long a single photo is the main subject on screen, before the next one starts dissolving in. */
const SLIDE_SECONDS = 3.75;
/** Length of the cross-dissolve between two consecutive slides. */
const XFADE_SECONDS = 0.9;
const TARGET = { w: 1080, h: 1920 };
/** Top of the Ken Burns drift: 1.00 (no zoom) at the slide's first frame, this at its last. */
const ZOOM_END = 1.05;
/** A render with a complex multi-image filtergraph at 1080x1920 can take a while on a modest host. */
const FFMPEG_TIMEOUT_MS = 10 * 60_000;
/** More slides than this makes for an unreasonably long Reel; the operator can still publish a
 * carousel for the rest. */
export const MAX_REEL_SLIDES = 12;
export const MIN_REEL_SLIDES = 2;

async function ffmpegBin(): Promise<string> {
  const bin = (await import("ffmpeg-static")).default as unknown as string | null;
  if (!bin) throw new Error("ffmpeg not available");
  return bin;
}

/** Same spawn-with-a-kill-timer shape as lib/media.ts / lib/social/audio-mix.ts, but keeps ffmpeg's
 * own stderr tail so a bad filtergraph is diagnosable instead of just "exit 1". */
async function runFfmpeg(args: string[]): Promise<void> {
  const bin = await ffmpegBin();
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
    }, FFMPEG_TIMEOUT_MS);
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on("exit", (code) => {
      clearTimeout(timer);
      if (timedOut) return reject(new Error(`ffmpeg timed out after ${FFMPEG_TIMEOUT_MS / 1000}s`));
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg exit ${code}: ${stderr.split("\n").filter(Boolean).slice(-6).join(" | ")}`));
    });
  });
}

export type ReelResult = { path: string; durationSec: number };

/**
 * Renders the slideshow to a temp .mp4 and returns its path (the caller owns cleanup). `images` must
 * already be in the order the Reel should play them in (the post's own media order).
 */
export async function renderCinematicReel(images: Asset[], audioAbsPath: string | null): Promise<ReelResult> {
  if (images.length < MIN_REEL_SLIDES) throw new Error(`At least ${MIN_REEL_SLIDES} images are needed to generate a Reel`);
  const slides = images.slice(0, MAX_REEL_SLIDES);

  // Every source photo -> the same uncropped 1080x1920 frame, whatever its original aspect ratio.
  const framed: string[] = [];
  for (const a of slides) framed.push((await ensureCanvasVariant(a, "story_9_16", "blur")).absPath);

  const n = framed.length;
  // Every input is held slightly longer than its "visible" slot so xfade has material to blend
  // through on both the way in and the way out; the final `-t` below trims that padding back off.
  const inputSeconds = SLIDE_SECONDS + XFADE_SECONDS;
  const frames = Math.round(inputSeconds * FPS);
  const zoomStep = (ZOOM_END - 1) / frames;
  const finalDuration = n * SLIDE_SECONDS - (n - 1) * XFADE_SECONDS;

  const args: string[] = ["-y"];
  for (const f of framed) args.push("-loop", "1", "-t", inputSeconds.toFixed(3), "-i", f);
  const audioInputIndex = n;
  if (audioAbsPath) args.push("-stream_loop", "-1", "-i", audioAbsPath);

  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    // Centered zoom only (no directional pan): a safe, elegant drift that never risks panning off a
    // portrait source once it has been letterboxed onto the canvas.
    parts.push(
      `[${i}:v]zoompan=z='min(zoom+${zoomStep.toFixed(8)},${ZOOM_END})':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${TARGET.w}x${TARGET.h}:fps=${FPS},format=yuv420p,setsar=1[v${i}]`
    );
  }
  let prevLabel = "v0";
  for (let i = 1; i < n; i++) {
    const offset = (i * (SLIDE_SECONDS - XFADE_SECONDS)).toFixed(3);
    const outLabel = i === n - 1 ? "vout" : `vx${i}`;
    parts.push(`[${prevLabel}][v${i}]xfade=transition=fade:duration=${XFADE_SECONDS}:offset=${offset}[${outLabel}]`);
    prevLabel = outLabel;
  }
  // A single photo never reaches the xfade loop above (n is always >= MIN_REEL_SLIDES, but keep this
  // robust): v0 alone is already the finished video.
  const videoOutLabel = n === 1 ? "v0" : "vout";

  args.push("-filter_complex", parts.join(";"));
  args.push("-map", `[${videoOutLabel}]`);
  if (audioAbsPath) args.push("-map", `${audioInputIndex}:a`);
  args.push("-r", String(FPS));
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20");
  if (audioAbsPath) args.push("-c:a", "aac", "-b:a", "192k");
  // Caps both streams to the same, exact length — the audio loop (or the last slide's padding) is
  // trimmed here rather than relied on to stop on its own.
  args.push("-t", finalDuration.toFixed(3));
  args.push("-movflags", "+faststart");

  const out = path.join(os.tmpdir(), `reel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`);
  args.push(out);

  try {
    await runFfmpeg(args);
  } catch (e) {
    try {
      fs.unlinkSync(out);
    } catch {
      /* nothing to clean up */
    }
    throw e;
  }
  return { path: out, durationSec: finalDuration };
}
