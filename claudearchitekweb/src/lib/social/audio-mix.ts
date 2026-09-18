/**
 * Mixes the operator's chosen background-audio track into a video before it is published, with the
 * bundled ffmpeg. The video stream is copied, never re-encoded (`-c:v copy`) — only the audio changes,
 * so this is fast even for a long clip. Cached on disk under UPLOAD_DIR/derived/audiomix/, keyed by
 * both input files' size + mtime, so publishing the same post twice (a retry, a second platform) does
 * not re-run ffmpeg. Same spawn-with-a-kill-timer pattern as lib/media.ts's ffmpeg() / probeDuration().
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { env } from "../env";

export const AUDIO_MIX_DIR = "derived/audiomix";
const FFMPEG_TIMEOUT_MS = 5 * 60_000; // mixing runs for the length of the clip; longer than a thumbnail grab
const PROBE_TIMEOUT_MS = 20_000;
/** The ambient track sits under any dialogue/sound the video already has, not over it. */
const AMBIENT_UNDER_VOICE_VOLUME = 0.35;

async function ffmpegBin(): Promise<string> {
  const bin = (await import("ffmpeg-static")).default as unknown as string | null;
  if (!bin) throw new Error("ffmpeg not available");
  return bin;
}

async function runFfmpeg(args: string[]): Promise<void> {
  const bin = await ffmpegBin();
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: "ignore" });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
    }, FFMPEG_TIMEOUT_MS);
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on("exit", (code) => {
      clearTimeout(timer);
      if (timedOut) return reject(new Error(`ffmpeg timed out after ${FFMPEG_TIMEOUT_MS / 1000}s`));
      return code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`));
    });
  });
}

/** ffmpeg-static ships no ffprobe: read the stream list out of `ffmpeg -i`'s own stderr banner. */
async function hasAudioStream(src: string): Promise<boolean> {
  const bin = await ffmpegBin().catch(() => null);
  if (!bin) return false;
  return new Promise((resolve) => {
    const proc = spawn(bin, ["-i", src]);
    let err = "";
    const timer = setTimeout(() => proc.kill("SIGKILL"), PROBE_TIMEOUT_MS);
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("exit", () => {
      clearTimeout(timer);
      resolve(/Stream #\d+:\d+.*: Audio:/.test(err));
    });
    proc.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

function cacheFile(videoAbsPath: string, audioAbsPath: string) {
  const vs = fs.statSync(videoAbsPath);
  const as = fs.statSync(audioAbsPath);
  const sig = createHash("sha1")
    .update(JSON.stringify([videoAbsPath, vs.size, Math.round(vs.mtimeMs), audioAbsPath, as.size, Math.round(as.mtimeMs)]))
    .digest("hex")
    .slice(0, 16);
  const fileName = `mix-${sig}.mp4`;
  return { relPath: `${AUDIO_MIX_DIR}/${fileName}`, abs: path.join(env.uploadDir, AUDIO_MIX_DIR, fileName) };
}

export type AudioMixResult = { absPath: string; relPath: string; generated: boolean };

/**
 * Produces (or reuses the cached copy of) `videoAbsPath` with `audioAbsPath` mixed in, trimmed or
 * looped to the video's own length (`-shortest` against a `-stream_loop -1` audio input covers both
 * directions with one flag). When the video already carries a sound track, the new track is mixed
 * underneath it at a lower level instead of replacing it.
 */
export async function ensureMixedVideo(videoAbsPath: string, audioAbsPath: string): Promise<AudioMixResult> {
  const { relPath, abs } = cacheFile(videoAbsPath, audioAbsPath);
  if (fs.existsSync(abs) && fs.statSync(abs).size > 0) {
    const now = new Date();
    fs.utimesSync(abs, now, now);
    return { absPath: abs, relPath, generated: false };
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.tmp.mp4`;
  const videoHasAudio = await hasAudioStream(videoAbsPath);
  const args = videoHasAudio
    ? [
        "-y",
        "-i", videoAbsPath,
        "-stream_loop", "-1", "-i", audioAbsPath,
        "-filter_complex", `[0:a]volume=1.0[voice];[1:a]volume=${AMBIENT_UNDER_VOICE_VOLUME}[amb];[voice][amb]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
        "-map", "0:v", "-map", "[aout]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-shortest", tmp,
      ]
    : [
        "-y",
        "-i", videoAbsPath,
        "-stream_loop", "-1", "-i", audioAbsPath,
        "-map", "0:v", "-map", "1:a",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-shortest", tmp,
      ];
  try {
    await runFfmpeg(args);
  } catch (e) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* nothing to clean up */
    }
    throw e;
  }
  fs.renameSync(tmp, abs);
  return { absPath: abs, relPath, generated: true };
}

/** Removes cached mixes not used for maxAgeMs — same convention as media-prep's cleanupDerived. */
export function cleanupAudioMixCache(maxAgeMs = 48 * 3600_000): number {
  const root = path.join(env.uploadDir, AUDIO_MIX_DIR);
  if (!fs.existsSync(root)) return 0;
  let removed = 0;
  for (const f of fs.readdirSync(root)) {
    const file = path.join(root, f);
    try {
      if (Date.now() - fs.statSync(file).mtimeMs > maxAgeMs) {
        fs.unlinkSync(file);
        removed++;
      }
    } catch {
      /* ignore */
    }
  }
  return removed;
}
