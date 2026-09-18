/**
 * Social publishing adapters. Each adapter publishes ONE variant of a post.
 * Without credentials an adapter returns status "simulated" with a clear note,
 * so the whole pipeline can be tested locally end-to-end. A dry run applies the same
 * media checks as the real call, so it fails where the real call would fail.
 *
 * Platform notes (research, Sept 2026):
 *  - Facebook Page / Instagram Business: Meta Graph API, free, own page works with Standard Access
 *    (no App Review) when the token owner is an admin of the app. Instagram needs JPEG on a PUBLIC URL,
 *    feed images within 4:5 – 1.91:1.
 *  - LinkedIn company page: Community Management API (vetting needed). Personal profile: w_member_social.
 *    The Linkedin-Version header (YYYYMM) is supported for about a year: bump LINKEDIN_API_VERSION yearly.
 *  - YouTube: videos.insert; unverified projects upload as PRIVATE until the compliance audit passes.
 *  - Telegram channel: bot must be channel admin. Free, no approval. Photos 10 MB, other files 50 MB,
 *    media captions 1024 characters, messages 4096.
 *  - TikTok: needs audited app; unaudited posts are private → we do not call it, only simulate.
 *
 * Uploads never read a whole file into memory: files are attached as file-backed blobs or sent in parts.
 */
import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
import { absPath } from "../media";
import { getSetting } from "../settings";
import * as tg from "../telegram";
import type { Asset, Post, PostVariant } from "../db/schema";
import { IMAGE_SPECS, VIDEO_MAX_BYTES, planImage, prepareImage } from "./media-prep";
import { socialMessages, type UiLocale } from "./messages";

export type PublishResult = {
  status: "published" | "simulated" | "failed";
  externalId?: string;
  externalUrl?: string;
  error?: string;
  note?: string;
};

export type PublishInput = {
  post: Post;
  variant: PostVariant;
  assets: Asset[]; // ordered media for this post (images and/or one video)
  posterAsset?: Asset | null; // branded poster (if generated)
  publicBaseUrl: string; // env.appUrl (must be public for Instagram)
  locale?: UiLocale; // language of notes and operator-facing errors (default: Armenian)
};

type Messages = ReturnType<typeof socialMessages>;

const VIDEO_FORMATS = ["video", "reel", "short"];
const API_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 15 * 60_000;

const fail = (error: string): PublishResult => ({ status: "failed", error });

/** fetch with a timeout and an error message that names the host instead of "fetch failed". */
async function http(url: string, init: RequestInit = {}, timeoutMs = API_TIMEOUT_MS): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    const name = (e as { name?: string }).name;
    const host = new URL(url).host;
    throw new Error(name === "TimeoutError" || name === "AbortError" ? `${host}: timed out after ${Math.round(timeoutMs / 1000)} s` : `${host}: network error`);
  }
}

function hashtagsOf(v: PostVariant): string[] {
  try {
    const raw = JSON.parse(v.hashtags || "[]") as unknown;
    return Array.isArray(raw) ? [...new Set(raw.map(String).map((t) => t.trim()).filter(Boolean))] : [];
  } catch {
    return [];
  }
}

/** Text as published: body, CTA (unless already in the body) and hashtags. The variant title is only used by platforms with `usesTitle`. */
function fullText(v: PostVariant): string {
  const parts = [v.text.trim(), v.cta && !v.text.includes(v.cta) ? v.cta : "", hashtagsOf(v).join(" ")].filter(Boolean);
  return parts.join("\n\n");
}

function pickImages(input: PublishInput): Asset[] {
  const imgs = input.assets.filter((a) => a.mime.startsWith("image/"));
  if (input.posterAsset) return [input.posterAsset, ...imgs.filter((a) => a.id !== input.posterAsset?.id)];
  return imgs;
}
function pickVideo(input: PublishInput): Asset | undefined {
  return input.assets.find((a) => a.mime.startsWith("video/"));
}

/** Missing file or a file over the platform limit → operator-facing error text; null when fine. */
function fileProblem(asset: Asset, platform: string, limit: number | undefined, m: Messages): string | null {
  let size: number;
  try {
    size = fs.statSync(absPath(asset.relPath)).size;
  } catch {
    return m.fileMissing(asset.originalName);
  }
  return limit && size > limit ? m.tooLarge(platform, asset.originalName, size, limit) : null;
}

/** Images are downscaled / converted automatically, so only a missing file is a problem. */
function firstImageProblem(images: Asset[], platform: string, m: Messages): string | null {
  for (const img of images) {
    const p = fileProblem(img, platform, undefined, m);
    if (p) return p;
  }
  return null;
}

async function blobOf(file: string): Promise<Blob> {
  return fs.openAsBlob(file);
}

// ---------------------------------------------------------------------------
// Configuration checks (one helper per platform, shared by the adapter and platformStatus)
// ---------------------------------------------------------------------------
export function facebookConfigured() {
  return !!(env.meta.pageId && env.meta.pageToken);
}
export function instagramConfigured() {
  return !!(env.meta.igUserId && env.meta.pageToken);
}
/** A placeholder such as urn:li:organization:XXXXXXX must not count as configured. */
export function linkedinConfigured() {
  return !!env.linkedin.token && /^urn:li:organization:\d+$/.test(env.linkedin.orgUrn.trim());
}
export function youtubeConfigured() {
  return !!(env.youtube.clientId && env.youtube.clientSecret && env.youtube.refreshToken);
}
/** Channel id from Admin → Settings → Telegram (falls back to TELEGRAM_CHANNEL_ID). */
export function telegramChannelId() {
  return (getSetting("telegram").channelId || "").trim();
}

// ---------------------------------------------------------------------------
// Facebook Page
// ---------------------------------------------------------------------------
async function publishFacebook(input: PublishInput): Promise<PublishResult> {
  const m = socialMessages(input.locale);
  const text = fullText(input.variant);
  const images = pickImages(input).slice(0, 10);
  const video = pickVideo(input);
  const format = input.variant.format;
  if (!video && (format === "video" || format === "reel")) return fail(m.noVideo("Facebook"));
  // A video is posted whenever it is the only media, or the format asks for it (video / reel / short).
  const useVideo = !!video && (images.length === 0 || VIDEO_FORMATS.includes(format));
  const problem = useVideo && video ? fileProblem(video, "Facebook", VIDEO_MAX_BYTES.facebook, m) : firstImageProblem(images, "Facebook", m);
  if (problem) return fail(problem);
  if (!facebookConfigured()) {
    return { status: "simulated", note: m.simFacebook(m.media({ video: useVideo, images: images.length }), text.length) };
  }
  const base = `https://graph.facebook.com/v21.0`;
  type FbJson = { id?: string; error?: { message: string } };
  try {
    if (useVideo && video) {
      const form = new FormData();
      form.append("access_token", env.meta.pageToken);
      form.append("description", text);
      form.append("source", await blobOf(absPath(video.relPath)), video.fileName);
      const res = await http(`https://graph-video.facebook.com/v21.0/${env.meta.pageId}/videos`, { method: "POST", body: form }, UPLOAD_TIMEOUT_MS);
      const json = (await res.json()) as FbJson;
      if (!res.ok || !json.id) throw new Error(json.error?.message || `video upload failed (${res.status})`);
      return { status: "published", externalId: json.id, externalUrl: `https://www.facebook.com/${json.id}` };
    }
    if (images.length === 0) {
      const res = await http(`${base}/${env.meta.pageId}/feed`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, access_token: env.meta.pageToken }) });
      const json = (await res.json()) as FbJson;
      if (!res.ok || !json.id) throw new Error(json.error?.message || `feed post failed (${res.status})`);
      return { status: "published", externalId: json.id, externalUrl: `https://www.facebook.com/${json.id}` };
    }
    // Upload photos unpublished, then attach to one feed post.
    const mediaIds: string[] = [];
    for (const img of images) {
      const ready = await prepareImage(img, IMAGE_SPECS.facebook);
      const form = new FormData();
      form.append("access_token", env.meta.pageToken);
      form.append("published", "false");
      form.append("source", await blobOf(ready.absPath), ready.fileName);
      const res = await http(`${base}/${env.meta.pageId}/photos`, { method: "POST", body: form }, UPLOAD_TIMEOUT_MS);
      const json = (await res.json()) as FbJson;
      if (!res.ok || !json.id) throw new Error(json.error?.message || `photo upload failed (${res.status})`);
      mediaIds.push(json.id);
    }
    const form = new URLSearchParams({ message: text, access_token: env.meta.pageToken });
    mediaIds.forEach((id, i) => form.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id })));
    const res = await http(`${base}/${env.meta.pageId}/feed`, { method: "POST", body: form });
    const json = (await res.json()) as FbJson;
    if (!res.ok || !json.id) throw new Error(json.error?.message || `feed post failed (${res.status})`);
    return { status: "published", externalId: json.id, externalUrl: `https://www.facebook.com/${json.id}` };
  } catch (e) {
    return fail((e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Instagram Business (container flow, media must be on a public URL)
// ---------------------------------------------------------------------------
async function publishInstagram(input: PublishInput): Promise<PublishResult> {
  const m = socialMessages(input.locale);
  const text = fullText(input.variant);
  const images = pickImages(input).slice(0, 10);
  const video = pickVideo(input);
  // Reels whenever a video is attached and the format is a video one, or the video is the only media.
  const useReel = !!video && (VIDEO_FORMATS.includes(input.variant.format) || images.length === 0);
  if (!useReel && images.length === 0) return fail(m.igNeedsMedia);
  const problem = useReel && video ? fileProblem(video, "Instagram", VIDEO_MAX_BYTES.instagram, m) : firstImageProblem(images, "Instagram", m);
  if (problem) return fail(problem);

  if (!instagramConfigured()) {
    const notes = [m.simInstagram(useReel ? m.igReel : images.length > 1 ? m.igCarousel(images.length) : m.igSingle, input.publicBaseUrl)];
    if (!useReel) {
      const plans = images.map((a) => planImage(a, IMAGE_SPECS.instagram));
      const converted = plans.filter((p) => p.converted).length;
      const padded = plans.filter((p) => p.padded).length;
      if (converted) notes.push(m.igConverted(converted));
      if (padded) notes.push(m.igPadded(padded));
    }
    return { status: "simulated", note: notes.join(" ") };
  }
  if (!/^https:\/\//.test(input.publicBaseUrl) || /localhost|127\.0\.0\.1/.test(input.publicBaseUrl)) {
    return fail(m.igNeedsPublicUrl);
  }
  const base = `https://graph.facebook.com/v21.0`;
  const token = env.meta.pageToken;
  const publicUrl = (relPath: string) => `${input.publicBaseUrl}/media/${relPath.split(path.sep).join("/")}`;
  type IgJson = { id?: string; status_code?: string; status?: string; permalink?: string; error?: { message: string } };
  const createContainer = async (params: Record<string, string>) => {
    const res = await http(`${base}/${env.meta.igUserId}/media`, { method: "POST", body: new URLSearchParams({ ...params, access_token: token }) });
    const json = (await res.json()) as IgJson;
    if (!res.ok || !json.id) throw new Error(json.error?.message || `container failed (${res.status})`);
    return json.id;
  };
  const waitReady = async (id: string) => {
    let last = "unknown";
    for (let i = 0; i < 30; i++) {
      const res = await http(`${base}/${id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`);
      const json = (await res.json()) as IgJson;
      if (!res.ok || json.error) throw new Error(json.error?.message || `Instagram container status failed (${res.status})`);
      last = json.status_code ?? last;
      if (json.status_code === "FINISHED") return;
      if (json.status_code === "ERROR" || json.status_code === "EXPIRED") throw new Error(`Instagram container processing failed (${json.status_code}${json.status ? `: ${json.status}` : ""})`);
      await new Promise((r) => setTimeout(r, 4000));
    }
    throw new Error(`Instagram container still processing after 120 s (last status: ${last}). Try again in a few minutes.`);
  };
  try {
    let creationId: string;
    const notes: string[] = [];
    if (useReel && video) {
      creationId = await createContainer({ media_type: "REELS", video_url: publicUrl(video.relPath), caption: text, share_to_feed: "true" });
      await waitReady(creationId);
    } else {
      // Instagram only takes JPEG within 4:5 – 1.91:1: convert and pad (never crop) what does not fit.
      const ready = [];
      for (const img of images) ready.push(await prepareImage(img, IMAGE_SPECS.instagram));
      const converted = ready.filter((r) => r.converted).length;
      const padded = ready.filter((r) => r.padded).length;
      if (converted) notes.push(m.igConverted(converted));
      if (padded) notes.push(m.igPadded(padded));
      if (ready.length >= 2) {
        const children: string[] = [];
        for (const r of ready) children.push(await createContainer({ image_url: publicUrl(r.relPath), is_carousel_item: "true" }));
        creationId = await createContainer({ media_type: "CAROUSEL", children: children.join(","), caption: text });
      } else {
        creationId = await createContainer({ image_url: publicUrl(ready[0].relPath), caption: text });
      }
    }
    const res = await http(`${base}/${env.meta.igUserId}/media_publish`, { method: "POST", body: new URLSearchParams({ creation_id: creationId, access_token: token }) });
    const json = (await res.json()) as IgJson;
    if (!res.ok || !json.id) throw new Error(json.error?.message || `publish failed (${res.status})`);
    // Link to the post itself; when the lookup fails there is simply no link (never the home page).
    let permalink: string | undefined;
    try {
      const pr = await http(`${base}/${json.id}?fields=permalink&access_token=${encodeURIComponent(token)}`);
      const pj = (await pr.json()) as IgJson;
      if (pr.ok && pj.permalink) permalink = pj.permalink;
    } catch {
      /* no link */
    }
    return { status: "published", externalId: json.id, externalUrl: permalink, note: notes.length ? notes.join(" ") : undefined };
  } catch (e) {
    return fail((e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// LinkedIn organization page (Posts API + Images/Videos API)
// ---------------------------------------------------------------------------
/** Supported for about a year after release: bump the default (and LINKEDIN_API_VERSION) yearly. */
const LINKEDIN_DEFAULT_VERSION = "202606";

/** Escapes the characters LinkedIn's "little text" format reserves, so the text is published as written. */
export function escapeLittleText(text: string): string {
  return text.replace(/[\\|{}@\[\]()<>#*_~]/g, (ch) => `\\${ch}`);
}

function hashtagTemplate(tag: string): string {
  const clean = tag.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
  return clean ? `{hashtag|\\#|${clean.replace(/_/g, "\\_")}}` : "";
}

/** Body text → little text: everything escaped, #tags (inline and the hashtag list) as hashtag templates. */
export function linkedInCommentary(body: string, hashtags: string[]): string {
  const inline = /(^|[^\p{L}\p{N}_&#])#([\p{L}\p{N}_]+)/gu;
  let out = "";
  let last = 0;
  for (const match of body.matchAll(inline)) {
    const start = match.index ?? 0;
    out += escapeLittleText(body.slice(last, start) + match[1]) + hashtagTemplate(match[2]);
    last = start + match[0].length;
  }
  out += escapeLittleText(body.slice(last));
  const tags = [...new Set(hashtags.map(hashtagTemplate).filter(Boolean))];
  return [out.trim(), tags.join(" ")].filter(Boolean).join("\n\n");
}

async function publishLinkedIn(input: PublishInput): Promise<PublishResult> {
  const m = socialMessages(input.locale);
  const v = input.variant;
  const body = [v.text.trim(), v.cta && !v.text.includes(v.cta) ? v.cta : ""].filter(Boolean).join("\n\n");
  const images = pickImages(input);
  const video = pickVideo(input);
  const media = video ?? images[0];
  if (media) {
    const problem = fileProblem(media, "LinkedIn", undefined, m);
    if (problem) return fail(problem);
  }
  if (!linkedinConfigured()) {
    return { status: "simulated", note: m.simLinkedIn(fullText(v).length, m.media({ video: !!video, images: Math.min(images.length, 1) })) };
  }
  const orgUrn = env.linkedin.orgUrn.trim();
  const version = (process.env.LINKEDIN_API_VERSION || LINKEDIN_DEFAULT_VERSION).trim();
  const auth = { Authorization: `Bearer ${env.linkedin.token}` };
  const headers = { ...auth, "Linkedin-Version": version, "X-Restli-Protocol-Version": "2.0.0", "Content-Type": "application/json" };
  const explain = async (res: Response, what: string) => {
    if (res.status === 426) return new Error(m.liVersion(version));
    return new Error(`LinkedIn ${what} failed (${res.status}): ${(await res.text().catch(() => "")).slice(0, 300)}`);
  };
  try {
    let content: Record<string, unknown> | undefined;
    if (media) {
      const file = video ? { absPath: absPath(video.relPath) } : await prepareImage(media, IMAGE_SPECS.linkedin);
      const size = fs.statSync(file.absPath).size;
      const kind = video ? "videos" : "images";
      const init = await http(`https://api.linkedin.com/rest/${kind}?action=initializeUpload`, {
        method: "POST",
        headers,
        body: JSON.stringify({ initializeUploadRequest: { owner: orgUrn, ...(video ? { fileSizeBytes: size, uploadCaptions: false, uploadThumbnail: false } : {}) } }),
      });
      if (!init.ok) throw await explain(init, "initializeUpload");
      const value = ((await init.json()) as { value?: { uploadUrl?: string; uploadInstructions?: { uploadUrl: string; firstByte: number; lastByte: number }[]; uploadToken?: string; image?: string; video?: string } }).value;
      const urn = value?.image || value?.video;
      if (!urn) throw new Error("LinkedIn initializeUpload returned no media id");

      if (video) {
        // Multipart: PUT every byte range to its own URL, collect the ETags, then finalize and wait until AVAILABLE.
        const instructions = value?.uploadInstructions ?? [];
        if (!instructions.length) throw new Error("LinkedIn initializeUpload returned no upload instructions");
        const etags: string[] = [];
        const fh = await fs.promises.open(file.absPath, "r");
        try {
          for (const part of instructions) {
            const length = part.lastByte - part.firstByte + 1;
            const buf = Buffer.alloc(length);
            await fh.read(buf, 0, length, part.firstByte);
            const put = await http(part.uploadUrl, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: buf }, UPLOAD_TIMEOUT_MS);
            if (!put.ok) throw new Error(`LinkedIn video part upload failed (${put.status})`);
            const etag = put.headers.get("etag");
            if (!etag) throw new Error("LinkedIn video part upload returned no ETag");
            etags.push(etag.replace(/^"|"$/g, ""));
          }
        } finally {
          await fh.close();
        }
        const fin = await http("https://api.linkedin.com/rest/videos?action=finalizeUpload", {
          method: "POST",
          headers,
          body: JSON.stringify({ finalizeUploadRequest: { video: urn, uploadToken: value?.uploadToken ?? "", uploadedPartIds: etags } }),
        });
        if (!fin.ok) throw await explain(fin, "finalizeUpload");
        let status = "PROCESSING";
        for (let i = 0; i < 60 && status !== "AVAILABLE"; i++) {
          await new Promise((r) => setTimeout(r, 5000));
          const st = await http(`https://api.linkedin.com/rest/videos/${encodeURIComponent(urn)}`, { headers });
          if (!st.ok) throw await explain(st, "video status");
          status = ((await st.json()) as { status?: string }).status ?? status;
          if (status === "PROCESSING_FAILED") throw new Error("LinkedIn could not process the video");
        }
        if (status !== "AVAILABLE") throw new Error(`LinkedIn video still processing after 5 min (last status: ${status}). Try again later.`);
      } else {
        if (!value?.uploadUrl) throw new Error("LinkedIn initializeUpload returned no upload URL");
        const put = await http(value.uploadUrl, { method: "PUT", headers: { ...auth, "Content-Type": "application/octet-stream" }, body: await blobOf(file.absPath) }, UPLOAD_TIMEOUT_MS);
        if (!put.ok) throw new Error(`LinkedIn image upload failed (${put.status})`);
      }
      content = { media: { id: urn, title: (v.title ?? input.post.title).slice(0, 200) } };
    }
    const res = await http("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers,
      body: JSON.stringify({ author: orgUrn, commentary: linkedInCommentary(body, hashtagsOf(v)), visibility: "PUBLIC", distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] }, lifecycleState: "PUBLISHED", isReshareDisabledByAuthor: false, ...(content ? { content } : {}) }),
    });
    if (res.status !== 201) throw await explain(res, "post");
    const id = res.headers.get("x-restli-id") || "";
    return { status: "published", externalId: id, externalUrl: id ? `https://www.linkedin.com/feed/update/${id}` : undefined };
  } catch (e) {
    return fail((e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// YouTube (Data API v3, OAuth refresh token, resumable upload streamed from disk)
// ---------------------------------------------------------------------------
/** Cuts a string to at most `maxBytes` UTF-8 bytes without splitting a character. */
export function truncateUtf8(text: string, maxBytes: number): string {
  const enc = new TextEncoder();
  if (enc.encode(text).length <= maxBytes) return text;
  let bytes = 0;
  let out = "";
  for (const ch of Array.from(text)) {
    const n = enc.encode(ch).length;
    if (bytes + n > maxBytes) break;
    bytes += n;
    out += ch;
  }
  return out.trimEnd();
}

/** YouTube rejects "<" and ">" and counts limits in bytes (description 5000) / characters (title 100). */
export function youtubeMeta(title: string, description: string) {
  const strip = (s: string) => s.replace(/[<>]/g, "");
  return { title: Array.from(strip(title).trim()).slice(0, 100).join(""), description: truncateUtf8(strip(description), 5000) };
}

async function youtubeAccessToken(): Promise<string> {
  const res = await http("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: env.youtube.clientId, client_secret: env.youtube.clientSecret, refresh_token: env.youtube.refreshToken, grant_type: "refresh_token" }),
  });
  const json = (await res.json()) as { access_token?: string; error_description?: string };
  if (!json.access_token) throw new Error(json.error_description || "YouTube token refresh failed");
  return json.access_token;
}

async function publishYouTube(input: PublishInput): Promise<PublishResult> {
  const m = socialMessages(input.locale);
  const video = pickVideo(input);
  // Validated before anything is uploaded.
  const { title, description } = youtubeMeta(input.variant.title || input.post.title, fullText(input.variant));
  if (!video) return fail(m.ytNeedsVideo);
  const problem = fileProblem(video, "YouTube", undefined, m);
  if (problem) return fail(problem);
  if (!youtubeConfigured()) {
    return { status: "simulated", note: m.simYouTube(title, Math.round(video.durationSec ?? 0)) };
  }
  try {
    const token = await youtubeAccessToken();
    const file = absPath(video.relPath);
    const size = fs.statSync(file).size;
    const meta = { snippet: { title, description, tags: hashtagsOf(input.variant).map((t) => t.replace(/^#/, "").replace(/[<>]/g, "")).slice(0, 15), categoryId: "26" }, status: { privacyStatus: process.env.YOUTUBE_PRIVACY || "public", selfDeclaredMadeForKids: false } };
    const start = await http("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Length": String(size), "X-Upload-Content-Type": video.mime },
      body: JSON.stringify(meta),
    });
    const session = start.headers.get("location");
    if (!start.ok || !session) {
      const err = (await start.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(err?.error?.message || `YouTube upload could not start (${start.status})`);
    }
    const res = await http(session, { method: "PUT", headers: { "Content-Type": video.mime }, body: await blobOf(file) }, 60 * 60_000);
    const json = (await res.json().catch(() => null)) as { id?: string; error?: { message: string } } | null;
    if (!res.ok || !json?.id) throw new Error(json?.error?.message || `upload failed (${res.status})`);
    return { status: "published", externalId: json.id, externalUrl: `https://youtu.be/${json.id}` };
  } catch (e) {
    return fail((e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Telegram channel
// ---------------------------------------------------------------------------
async function publishTelegram(input: PublishInput): Promise<PublishResult> {
  const m = socialMessages(input.locale);
  const text = fullText(input.variant);
  const channel = telegramChannelId();
  const images = pickImages(input).slice(0, 10);
  const video = pickVideo(input);
  const useVideo = !!video && (images.length === 0 || VIDEO_FORMATS.includes(input.variant.format));
  const problem = useVideo && video ? fileProblem(video, "Telegram", VIDEO_MAX_BYTES.telegram, m) : firstImageProblem(images, "Telegram", m);
  if (problem) return fail(problem);
  const hasMedia = useVideo || images.length > 0;
  // A media caption holds 1024 characters. A longer text is never cut: it follows as its own message(s).
  const textSeparate = hasMedia && text.length > tg.CAPTION_MAX;
  const note = textSeparate ? m.tgTextSeparate(text.length) : undefined;
  if (!tg.telegramEnabled() || !channel) {
    return { status: "simulated", note: [m.simTelegram(m.media({ video: useVideo, images: images.length })), note].filter(Boolean).join(" ") };
  }
  try {
    const caption = textSeparate ? undefined : text || undefined;
    let messageId = 0;
    if (useVideo && video) {
      const r = await tg.sendVideo(channel, absPath(video.relPath), caption);
      messageId = r.result.message_id;
    } else if (images.length > 0) {
      const files: string[] = [];
      for (const img of images) files.push((await prepareImage(img, IMAGE_SPECS.telegram)).absPath);
      if (files.length > 1) {
        const r = await tg.sendMediaGroup(channel, files.map((f) => ({ path: f, type: "photo" as const })), caption);
        messageId = r.result[0]?.message_id ?? 0;
      } else {
        const r = await tg.sendPhoto(channel, files[0], caption);
        messageId = r.result.message_id;
      }
    }
    if (!hasMedia || textSeparate) {
      const first = await tg.sendLongMessage(channel, text);
      if (!messageId) messageId = first;
    }
    const handle = channel.startsWith("@") ? channel.slice(1) : null;
    return { status: "published", externalId: String(messageId), externalUrl: handle ? `https://t.me/${handle}/${messageId}` : undefined, note };
  } catch (e) {
    return fail((e as Error).message);
  }
}

async function publishTikTok(input: PublishInput): Promise<PublishResult> {
  const m = socialMessages(input.locale);
  const video = pickVideo(input);
  return { status: "simulated", note: m.tiktokManual(video ? path.basename(video.originalName || video.fileName) : null) };
}

export const ADAPTERS: Record<string, (i: PublishInput) => Promise<PublishResult>> = {
  facebook: publishFacebook,
  instagram: publishInstagram,
  linkedin: publishLinkedIn,
  youtube: publishYouTube,
  telegram: publishTelegram,
  tiktok: publishTikTok,
};

export function platformStatus() {
  return {
    facebook: facebookConfigured() ? "connected" : "dry_run",
    instagram: instagramConfigured() ? "connected" : "dry_run",
    linkedin: linkedinConfigured() ? "connected" : "dry_run",
    youtube: youtubeConfigured() ? "connected" : "dry_run",
    telegram: tg.telegramEnabled() && telegramChannelId() ? "connected" : tg.telegramEnabled() ? "bot_only" : "dry_run",
    tiktok: "manual",
  } as const;
}

/**
 * `usesTitle`: the variant title is published (YouTube title, LinkedIn media title). Other platforms
 * publish text + CTA + hashtags only, so the editor should neither ask for nor preview a title there.
 * `mediaCaptionMax`: with media attached, a longer text is sent as a separate message under the media.
 */
export const PLATFORM_META: Record<string, { label: string; color: string; maxChars: number; usesTitle: boolean; mediaCaptionMax?: number }> = {
  facebook: { label: "Facebook", color: "#1877F2", maxChars: 63206, usesTitle: false },
  instagram: { label: "Instagram", color: "#E1306C", maxChars: 2200, usesTitle: false },
  linkedin: { label: "LinkedIn", color: "#0A66C2", maxChars: 3000, usesTitle: true },
  youtube: { label: "YouTube", color: "#FF0000", maxChars: 5000, usesTitle: true },
  telegram: { label: "Telegram", color: "#26A5E4", maxChars: 4096, usesTitle: false, mediaCaptionMax: tg.CAPTION_MAX },
  tiktok: { label: "TikTok", color: "#000000", maxChars: 2200, usesTitle: false },
};

