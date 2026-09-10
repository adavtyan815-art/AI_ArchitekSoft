/**
 * AI copywriting for social posts.
 *
 * Provider order: Claude (Anthropic SDK) → Gemini (REST) → deterministic templates.
 * The system therefore works offline and is upgraded automatically when a key is added.
 */
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";
import { getSetting } from "../settings";
import { buildTemplatePack } from "./templates";

export const PLATFORMS = ["facebook", "instagram", "linkedin", "telegram", "youtube", "tiktok"] as const;
export type Platform = (typeof PLATFORMS)[number];

export type PostGoal = "trust" | "sales_b2b" | "sales_b2c" | "showcase" | "education";

export type PostContext = {
  language: "hy" | "ru" | "en";
  goal: PostGoal;
  projectTitle?: string;
  projectType?: string; // kitchen | wardrobe | ...
  clientKind?: "b2b" | "b2c";
  materials?: string;
  description?: string;
  city?: string;
  assetSummary?: string; // "3 renders, 1 video (25s)"
  hasVideo?: boolean;
  liveLink?: string; // public demo link to mention (if any)
  extraInstructions?: string;
  platforms: Platform[];
};

export type VariantDraft = {
  platform: Platform;
  title?: string;
  text: string;
  hashtags: string[];
  cta?: string;
  format: "image" | "carousel" | "video" | "reel" | "short" | "text";
};

export type PostPack = {
  title: string;
  coreText: string;
  variants: VariantDraft[];
  provider: "claude" | "gemini" | "template";
};

const PLATFORM_RULES: Record<Platform, string> = {
  facebook:
    "Facebook Page: 2–4 short paragraphs, conversational but professional, one clear CTA with the website link, 4–6 hashtags at the end.",
  instagram:
    "Instagram: strong first line (hook, no clickbait), 2–3 short sentences, line breaks, CTA 'link in bio', 8–12 relevant hashtags at the end. No links in text.",
  linkedin:
    "LinkedIn (B2B, decision makers: furniture makers, showrooms, developers): a crisp headline as the first line, then 3–5 short lines or bullets with concrete business value (time, errors, approvals), end with a soft CTA. 3–5 hashtags. No emojis except at most one.",
  telegram:
    "Telegram channel: short (≤600 chars), plain and useful, one link, minimal hashtags (0–3). Formatting: plain text, no markdown.",
  youtube:
    "YouTube: a title ≤70 chars with the key phrase first, and a description with 2 paragraphs, a link line, and 5–8 hashtags/tags. If the media is vertical and short, mention #Shorts.",
  tiktok: "TikTok: 1–2 punchy lines (≤150 chars), 3–5 hashtags, no links.",
};

function languageName(l: PostContext["language"]) {
  return l === "hy" ? "Armenian (հայերեն, literate and professional)" : l === "ru" ? "Russian" : "English";
}

export function buildPrompt(ctx: PostContext) {
  const brand = getSetting("brand");
  const smm = getSetting("smm");
  const system = `You are the marketing copywriter of ${brand.name} (${brand.website}), an Armenian technology company.
Product: KitchenPro — a design-to-production platform for custom furniture (kitchens first). From one 3D design the customer gets an interactive 3D showroom link (walk around, open drawers, change materials, see the price, AR on phone) and the workshop gets production documents (cut list, edge banding, drilling coordinates, hardware and material bills). Other services: real-estate 3D presentations, showroom configurators, AR/VR, custom software. Built on Unreal Engine 5 with real manufacturers' materials and hardware (EGGER, Blum, Hettich).
Audience: B2B (furniture makers, showrooms, design studios, developers) and B2C (households ordering a kitchen).
Brand voice: ${smm.brandVoice}
Never invent numbers, client names, prices or awards. Do not use words like "revolutionary". Keep it concrete and calm. The goal is trust and sales, not likes.
Always write in ${languageName(ctx.language)}. Hashtags may mix the language and English.
Return ONLY a JSON object, no markdown fences, with this shape:
{"title": string (internal short title, max 60 chars), "coreText": string (the shared idea in 2–4 sentences), "variants": [{"platform": string, "title": string|null, "text": string, "hashtags": string[], "cta": string|null, "format": "image"|"carousel"|"video"|"reel"|"short"|"text"}]}`;

  const goalLine: Record<PostGoal, string> = {
    trust: "Goal: build trust and show expertise (how we work, why it is precise).",
    sales_b2b: "Goal: generate B2B enquiries from furniture makers and showrooms (pilot project offer).",
    sales_b2c: "Goal: generate B2C requests from people planning a kitchen (send measurements, get a 3D link).",
    showcase: "Goal: showcase a finished project elegantly; let the work speak.",
    education: "Goal: educate: explain one concept (e.g. why a cut list from the same model has fewer errors).",
  };

  const user = [
    goalLine[ctx.goal],
    ctx.projectTitle ? `Project: ${ctx.projectTitle}` : "",
    ctx.projectType ? `Type: ${ctx.projectType}` : "",
    ctx.clientKind ? `Client kind: ${ctx.clientKind}` : "",
    ctx.materials ? `Materials / hardware: ${ctx.materials}` : "",
    ctx.description ? `Notes: ${ctx.description}` : "",
    ctx.city ? `City: ${ctx.city}` : "",
    ctx.assetSummary ? `Media attached: ${ctx.assetSummary}` : "",
    ctx.liveLink ? `Public link to mention where links are allowed: ${ctx.liveLink}` : `Website: ${brand.website}`,
    ctx.extraInstructions ? `Extra instructions: ${ctx.extraInstructions}` : "",
    "",
    "Write one variant per platform, adapted to the platform rules:",
    ...ctx.platforms.map((p) => `- ${p}: ${PLATFORM_RULES[p]}`),
    `Format hint: ${ctx.hasVideo ? "video is available → prefer video/reel/short formats where suitable" : "images only → image or carousel"}.`,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("AI returned no JSON");
  }
}

function normalise(raw: unknown, ctx: PostContext, provider: PostPack["provider"]): PostPack {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const variantsRaw = Array.isArray(obj.variants) ? (obj.variants as Record<string, unknown>[]) : [];
  const variants: VariantDraft[] = [];
  for (const p of ctx.platforms) {
    const v = variantsRaw.find((x) => String(x.platform).toLowerCase() === p);
    if (!v) continue;
    variants.push({
      platform: p,
      title: v.title ? String(v.title) : undefined,
      text: String(v.text ?? "").trim(),
      hashtags: Array.isArray(v.hashtags) ? (v.hashtags as unknown[]).map(String).filter(Boolean) : [],
      cta: v.cta ? String(v.cta) : undefined,
      format: (["image", "carousel", "video", "reel", "short", "text"].includes(String(v.format)) ? String(v.format) : ctx.hasVideo ? "video" : "image") as VariantDraft["format"],
    });
  }
  if (variants.length === 0) throw new Error("AI returned no usable variants");
  // Fill missing platforms from templates so every requested platform has a draft.
  const fallback = buildTemplatePack(ctx);
  for (const p of ctx.platforms) {
    if (!variants.some((v) => v.platform === p)) {
      const t = fallback.variants.find((v) => v.platform === p);
      if (t) variants.push(t);
    }
  }
  return {
    title: String(obj.title ?? fallback.title).slice(0, 80),
    coreText: String(obj.coreText ?? fallback.coreText),
    variants,
    provider,
  };
}

async function generateWithClaude(ctx: PostContext): Promise<PostPack> {
  const client = new Anthropic({ apiKey: env.ai.anthropicKey });
  const { system, user } = buildPrompt(ctx);
  const response = await client.messages.create({
    model: env.ai.anthropicModel,
    max_tokens: 4000,
    system,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    messages: [{ role: "user", content: user }],
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined the request");
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return normalise(extractJson(text), ctx, "claude");
}

async function generateWithGemini(ctx: PostContext): Promise<PostPack> {
  const { system, user } = buildPrompt(ctx);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.ai.geminiModel}:generateContent?key=${env.ai.geminiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: user }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return normalise(extractJson(text), ctx, "gemini");
}

export function aiStatus() {
  if (env.ai.anthropicKey) return { provider: "claude" as const, model: env.ai.anthropicModel };
  if (env.ai.geminiKey) return { provider: "gemini" as const, model: env.ai.geminiModel };
  return { provider: "template" as const, model: "built-in templates" };
}

/** Generate a post pack. Falls back gracefully so the UI always gets a result. */
export async function generatePostPack(ctx: PostContext): Promise<PostPack & { warning?: string }> {
  const errors: string[] = [];
  if (env.ai.anthropicKey) {
    try {
      return await generateWithClaude(ctx);
    } catch (e) {
      errors.push(`Claude: ${(e as Error).message}`);
    }
  }
  if (env.ai.geminiKey) {
    try {
      return await generateWithGemini(ctx);
    } catch (e) {
      errors.push(`Gemini: ${(e as Error).message}`);
    }
  }
  const pack = buildTemplatePack(ctx);
  return { ...pack, warning: errors.length ? errors.join(" | ") : "No AI key configured — template copy generated. Add ANTHROPIC_API_KEY to .env for AI copywriting." };
}

/** Free-form rewrite of one variant (used by the "Improve" button and Telegram edit flow). */
export async function rewriteText(instruction: string, text: string, language: PostContext["language"]): Promise<string> {
  const prompt = `Rewrite the following social media post in ${languageName(language)} according to this instruction: "${instruction}". Keep the meaning, keep hashtags at the end if present, return only the new text.\n\n---\n${text}`;
  if (env.ai.anthropicKey) {
    const client = new Anthropic({ apiKey: env.ai.anthropicKey });
    const r = await client.messages.create({
      model: env.ai.anthropicModel,
      max_tokens: 2000,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      messages: [{ role: "user", content: prompt }],
    });
    return r.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
  }
  if (env.ai.geminiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.ai.geminiModel}:generateContent?key=${env.ai.geminiKey}`;
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() || text;
  }
  return text;
}
