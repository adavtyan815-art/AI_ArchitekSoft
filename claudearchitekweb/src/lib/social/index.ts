/**
 * Social publishing adapters. Each adapter publishes ONE variant of a post.
 * Without credentials an adapter returns status "simulated" with a clear note,
 * so the whole pipeline can be tested locally end-to-end.
 *
 * Platform notes (research, Sept 2026):
 *  - Facebook Page / Instagram Business: Meta Graph API, free, own page works with Standard Access
 *    (no App Review) when the token owner is an admin of the app. Instagram needs JPEG on a PUBLIC URL.
 *  - LinkedIn company page: Community Management API (vetting needed). Personal profile: w_member_social.
 *  - YouTube: videos.insert; unverified projects upload as PRIVATE until the compliance audit passes.
 *  - Telegram channel: bot must be channel admin. Free, no approval.
 *  - TikTok: needs audited app; unaudited posts are private → we do not call it, only simulate.
 */
import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
import { absPath } from "../media";
import * as tg from "../telegram";
import type { Asset, Post, PostVariant } from "../db/schema";

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
};

function fullText(v: PostVariant): string {
  const tags = (JSON.parse(v.hashtags || "[]") as string[]).join(" ");
  const parts = [v.text.trim(), v.cta && !v.text.includes(v.cta) ? v.cta : "", tags].filter(Boolean);
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

// ---------------------------------------------------------------------------
// Facebook Page
// ---------------------------------------------------------------------------
async function publishFacebook(input: PublishInput): Promise<PublishResult> {
  const text = fullText(input.variant);
  const images = pickImages(input);
  const video = pickVideo(input);
  if (!env.meta.pageId || !env.meta.pageToken) {
    return { status: "simulated", note: `Facebook՝ փորձնական. կհրապարակվեր ${video ? "1 վիդեո" : `${images.length} նկար`} և ${text.length} նիշ տեքստ։ Դիր META_PAGE_ID / META_PAGE_ACCESS_TOKEN։` };
  }
  const base = `https://graph.facebook.com/v21.0`;
  try {
    if (input.variant.format === "video" || input.variant.format === "reel") {
      if (!video) throw new Error("No video attached");
      const form = new FormData();
      form.append("access_token", env.meta.pageToken);
      form.append("description", text);
      form.append("source", new Blob([fs.readFileSync(absPath(video.relPath))]), video.fileName);
      const res = await fetch(`${base}/${env.meta.pageId}/videos`, { method: "POST", body: form });
      const json = (await res.json()) as { id?: string; error?: { message: string } };
      if (!res.ok || !json.id) throw new Error(json.error?.message || "video upload failed");
      return { status: "published", externalId: json.id, externalUrl: `https://www.facebook.com/${json.id}` };
    }
    if (images.length === 0) {
      const res = await fetch(`${base}/${env.meta.pageId}/feed`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, access_token: env.meta.pageToken }) });
      const json = (await res.json()) as { id?: string; error?: { message: string } };
      if (!res.ok || !json.id) throw new Error(json.error?.message || "feed post failed");
      return { status: "published", externalId: json.id, externalUrl: `https://www.facebook.com/${json.id}` };
    }
    // Upload photos unpublished, then attach to one feed post.
    const mediaIds: string[] = [];
    for (const img of images.slice(0, 10)) {
      const form = new FormData();
      form.append("access_token", env.meta.pageToken);
      form.append("published", "false");
      form.append("source", new Blob([fs.readFileSync(absPath(img.relPath))]), img.fileName);
      const res = await fetch(`${base}/${env.meta.pageId}/photos`, { method: "POST", body: form });
      const json = (await res.json()) as { id?: string; error?: { message: string } };
      if (!res.ok || !json.id) throw new Error(json.error?.message || "photo upload failed");
      mediaIds.push(json.id);
    }
    const body: Record<string, unknown> = { message: text, access_token: env.meta.pageToken };
    mediaIds.forEach((id, i) => (body[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id })));
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) form.append(k, String(v));
    const res = await fetch(`${base}/${env.meta.pageId}/feed`, { method: "POST", body: form });
    const json = (await res.json()) as { id?: string; error?: { message: string } };
    if (!res.ok || !json.id) throw new Error(json.error?.message || "feed post failed");
    return { status: "published", externalId: json.id, externalUrl: `https://www.facebook.com/${json.id}` };
  } catch (e) {
    return { status: "failed", error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Instagram Business (container flow, media must be on a public URL)
// ---------------------------------------------------------------------------
async function publishInstagram(input: PublishInput): Promise<PublishResult> {
  const text = fullText(input.variant);
  const images = pickImages(input).filter((a) => a.mime === "image/jpeg");
  const video = pickVideo(input);
  const publicUrl = (a: Asset) => `${input.publicBaseUrl}/media/${a.relPath}`;
  if (!env.meta.igUserId || !env.meta.pageToken) {
    return { status: "simulated", note: `Instagram՝ փորձնական. կհրապարակվեր ${video && input.variant.format === "reel" ? "Reel" : images.length > 1 ? `${images.length} նկարից կարուսել` : "1 նկար"}։ Դիր META_IG_USER_ID + META_PAGE_ACCESS_TOKEN և ${input.publicBaseUrl}-ը դարձրու հրապարակային (Instagram-ը մեդիան վերցնում է հասցեով)։` };
  }
  if (!/^https:\/\//.test(input.publicBaseUrl) || /localhost|127\.0\.0\.1/.test(input.publicBaseUrl)) {
    return { status: "failed", error: "Instagram-ին պետք է մեդիա հրապարակային https հասցեով։ APP_URL-ը լոկալ է։" };
  }
  const base = `https://graph.facebook.com/v21.0`;
  const token = env.meta.pageToken;
  const createContainer = async (params: Record<string, string>) => {
    const res = await fetch(`${base}/${env.meta.igUserId}/media`, { method: "POST", body: new URLSearchParams({ ...params, access_token: token }) });
    const json = (await res.json()) as { id?: string; error?: { message: string } };
    if (!res.ok || !json.id) throw new Error(json.error?.message || "container failed");
    return json.id;
  };
  const waitReady = async (id: string) => {
    for (let i = 0; i < 30; i++) {
      const res = await fetch(`${base}/${id}?fields=status_code&access_token=${token}`);
      const json = (await res.json()) as { status_code?: string };
      if (json.status_code === "FINISHED") return;
      if (json.status_code === "ERROR") throw new Error("container processing error");
      await new Promise((r) => setTimeout(r, 4000));
    }
  };
  try {
    let creationId: string;
    if (input.variant.format === "reel" && video) {
      creationId = await createContainer({ media_type: "REELS", video_url: publicUrl(video), caption: text, share_to_feed: "true" });
      await waitReady(creationId);
    } else if (images.length >= 2) {
      const children: string[] = [];
      for (const img of images.slice(0, 10)) children.push(await createContainer({ image_url: publicUrl(img), is_carousel_item: "true" }));
      creationId = await createContainer({ media_type: "CAROUSEL", children: children.join(","), caption: text });
    } else if (images.length === 1) {
      creationId = await createContainer({ image_url: publicUrl(images[0]), caption: text });
    } else {
      throw new Error("Instagram needs at least one JPEG image (or a video for Reels)");
    }
    const res = await fetch(`${base}/${env.meta.igUserId}/media_publish`, { method: "POST", body: new URLSearchParams({ creation_id: creationId, access_token: token }) });
    const json = (await res.json()) as { id?: string; error?: { message: string } };
    if (!res.ok || !json.id) throw new Error(json.error?.message || "publish failed");
    return { status: "published", externalId: json.id, externalUrl: `https://www.instagram.com/` };
  } catch (e) {
    return { status: "failed", error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// LinkedIn organization page (Posts API + Images/Videos API)
// ---------------------------------------------------------------------------
async function publishLinkedIn(input: PublishInput): Promise<PublishResult> {
  const text = fullText(input.variant);
  const images = pickImages(input);
  const video = pickVideo(input);
  if (!env.linkedin.token || !env.linkedin.orgUrn) {
    return { status: "simulated", note: `LinkedIn՝ փորձնական. կհրապարակվեր ${text.length} նիշ և ${video ? "1 վիդեո" : `${Math.min(images.length, 1)} նկար`}։ Դիր LINKEDIN_ACCESS_TOKEN + LINKEDIN_ORG_URN (պետք է Community Management API մուտք)։` };
  }
  const version = process.env.LINKEDIN_API_VERSION || "202506";
  const headers = { Authorization: `Bearer ${env.linkedin.token}`, "Linkedin-Version": version, "X-Restli-Protocol-Version": "2.0.0", "Content-Type": "application/json" };
  try {
    let content: Record<string, unknown> | undefined;
    const media = video ?? images[0];
    if (media) {
      const kind = video ? "videos" : "images";
      const init = await fetch(`https://api.linkedin.com/rest/${kind}?action=initializeUpload`, {
        method: "POST",
        headers,
        body: JSON.stringify({ initializeUploadRequest: { owner: env.linkedin.orgUrn, ...(video ? { fileSizeBytes: media.sizeBytes, uploadCaptions: false, uploadThumbnail: false } : {}) } }),
      });
      const initJson = (await init.json()) as { value?: { uploadUrl?: string; uploadInstructions?: { uploadUrl: string }[]; image?: string; video?: string } };
      const uploadUrl = initJson.value?.uploadUrl || initJson.value?.uploadInstructions?.[0]?.uploadUrl;
      const urn = initJson.value?.image || initJson.value?.video;
      if (!uploadUrl || !urn) throw new Error("LinkedIn initializeUpload failed");
      const put = await fetch(uploadUrl, { method: "PUT", headers: { Authorization: `Bearer ${env.linkedin.token}`, "Content-Type": "application/octet-stream" }, body: fs.readFileSync(absPath(media.relPath)) });
      if (!put.ok) throw new Error(`LinkedIn upload failed (${put.status})`);
      content = { media: { id: urn, title: input.variant.title ?? input.post.title } };
    }
    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers,
      body: JSON.stringify({ author: env.linkedin.orgUrn, commentary: text, visibility: "PUBLIC", distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] }, lifecycleState: "PUBLISHED", isReshareDisabledByAuthor: false, ...(content ? { content } : {}) }),
    });
    if (res.status !== 201) throw new Error(`LinkedIn post failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const id = res.headers.get("x-restli-id") || "";
    return { status: "published", externalId: id, externalUrl: id ? `https://www.linkedin.com/feed/update/${id}` : undefined };
  } catch (e) {
    return { status: "failed", error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// YouTube (Data API v3, OAuth refresh token)
// ---------------------------------------------------------------------------
async function youtubeAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: env.youtube.clientId, client_secret: env.youtube.clientSecret, refresh_token: env.youtube.refreshToken, grant_type: "refresh_token" }),
  });
  const json = (await res.json()) as { access_token?: string; error_description?: string };
  if (!json.access_token) throw new Error(json.error_description || "YouTube token refresh failed");
  return json.access_token;
}

async function publishYouTube(input: PublishInput): Promise<PublishResult> {
  const video = pickVideo(input);
  const title = (input.variant.title || input.post.title).slice(0, 100);
  const description = fullText(input.variant).slice(0, 4900);
  if (!video) return { status: "failed", error: "YouTube-ի համար պետք է վիդեո ֆայլ։" };
  if (!env.youtube.clientId || !env.youtube.refreshToken) {
    return { status: "simulated", note: `YouTube՝ փորձնական. կվերբեռնվեր «${title}» (${Math.round(video.durationSec ?? 0)} վրկ)։ Դիր YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN։ Չստուգված հավելվածի վերբեռնումները մնում են փակ։` };
  }
  try {
    const token = await youtubeAccessToken();
    const tags = JSON.parse(input.variant.hashtags || "[]") as string[];
    const meta = { snippet: { title, description, tags: tags.map((t) => t.replace(/^#/, "")).slice(0, 15), categoryId: "26" }, status: { privacyStatus: process.env.YOUTUBE_PRIVACY || "public", selfDeclaredMadeForKids: false } };
    const boundary = "architek_boundary";
    const fileBuf = fs.readFileSync(absPath(video.relPath));
    const head = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${video.mime}\r\n\r\n`);
    const tail = Buffer.from(`\r\n--${boundary}--`);
    const body = Buffer.concat([head, fileBuf, tail]);
    const res = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}`, "Content-Length": String(body.length) },
      body,
    });
    const json = (await res.json()) as { id?: string; error?: { message: string } };
    if (!res.ok || !json.id) throw new Error(json.error?.message || "upload failed");
    return { status: "published", externalId: json.id, externalUrl: `https://youtu.be/${json.id}` };
  } catch (e) {
    return { status: "failed", error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Telegram channel
// ---------------------------------------------------------------------------
async function publishTelegram(input: PublishInput): Promise<PublishResult> {
  const text = fullText(input.variant);
  const channel = env.telegram.channelId;
  const images = pickImages(input);
  const video = pickVideo(input);
  if (!tg.telegramEnabled() || !channel) {
    return { status: "simulated", note: `Telegram՝ փորձնական. կհրապարակվեր ալիքում ${video ? "1 վիդեոյով" : `${images.length} նկարով`}։ Դիր TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL_ID (բոտը պետք է լինի ալիքի ադմին)։` };
  }
  try {
    let messageId = 0;
    if ((input.variant.format === "video" || input.variant.format === "reel" || input.variant.format === "short") && video) {
      const r = await tg.sendVideo(channel, absPath(video.relPath), text);
      messageId = r.result.message_id;
    } else if (images.length > 1) {
      const r = await tg.sendMediaGroup(channel, images.slice(0, 10).map((a) => ({ path: absPath(a.relPath), type: "photo" as const })), text);
      messageId = r.result[0]?.message_id ?? 0;
    } else if (images.length === 1) {
      const r = await tg.sendPhoto(channel, absPath(images[0].relPath), text);
      messageId = r.result.message_id;
    } else {
      const r = await tg.sendMessage(channel, text);
      messageId = r.result.message_id;
    }
    const handle = channel.startsWith("@") ? channel.slice(1) : null;
    return { status: "published", externalId: String(messageId), externalUrl: handle ? `https://t.me/${handle}/${messageId}` : undefined };
  } catch (e) {
    return { status: "failed", error: (e as Error).message };
  }
}

async function publishTikTok(input: PublishInput): Promise<PublishResult> {
  const video = pickVideo(input);
  return { status: "simulated", note: `TikTok՝ ձեռքով քայլ. ${video ? `վերբեռնիր ${path.basename(video.fileName)}` : "վիդեո կցված չէ"} այս տարբերակի տեքստով։ (TikTok-ի API-ն պահանջում է ստուգված հավելված. չստուգված գրառումները մնում են փակ, ուստի չենք ավտոմատացնում։)` };
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
    facebook: env.meta.pageId && env.meta.pageToken ? "connected" : "dry_run",
    instagram: env.meta.igUserId && env.meta.pageToken ? "connected" : "dry_run",
    linkedin: env.linkedin.token && env.linkedin.orgUrn ? "connected" : "dry_run",
    youtube: env.youtube.clientId && env.youtube.refreshToken ? "connected" : "dry_run",
    telegram: tg.telegramEnabled() && env.telegram.channelId ? "connected" : tg.telegramEnabled() ? "bot_only" : "dry_run",
    tiktok: "manual",
  } as const;
}

export const PLATFORM_META: Record<string, { label: string; color: string; maxChars: number }> = {
  facebook: { label: "Facebook", color: "#1877F2", maxChars: 63206 },
  instagram: { label: "Instagram", color: "#E1306C", maxChars: 2200 },
  linkedin: { label: "LinkedIn", color: "#0A66C2", maxChars: 3000 },
  youtube: { label: "YouTube", color: "#FF0000", maxChars: 5000 },
  telegram: { label: "Telegram", color: "#26A5E4", maxChars: 4096 },
  tiktok: { label: "TikTok", color: "#000000", maxChars: 2200 },
};
