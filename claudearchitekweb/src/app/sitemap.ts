import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { LOCALES, localePath } from "@/lib/i18n";
import { getPortfolio } from "@/lib/public-data";

const ROUTES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/kitchenpro", priority: 0.9, changeFrequency: "monthly" },
  { path: "/for-business", priority: 0.9, changeFrequency: "monthly" },
  { path: "/for-home", priority: 0.9, changeFrequency: "monthly" },
  { path: "/solutions", priority: 0.7, changeFrequency: "monthly" },
  { path: "/how-it-works", priority: 0.7, changeFrequency: "monthly" },
  { path: "/portfolio", priority: 0.8, changeFrequency: "weekly" },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
  { path: "/start", priority: 0.8, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.appUrl;
  const now = new Date();
  const entry = (path: string, priority: number, changeFrequency: (typeof ROUTES)[number]["changeFrequency"]): MetadataRoute.Sitemap => [
    {
      url: `${base}${localePath("hy", path)}`,
      lastModified: now,
      priority,
      changeFrequency,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${base}${localePath(l, path)}`])) },
    },
    ...LOCALES.filter((l) => l !== "hy").map((l) => ({ url: `${base}${localePath(l, path)}`, lastModified: now, priority, changeFrequency })),
  ];

  const out: MetadataRoute.Sitemap = ROUTES.flatMap((r) => entry(r.path, r.priority, r.changeFrequency));
  try {
    for (const it of getPortfolio("hy")) out.push(...entry(`/portfolio/${it.slug}`, 0.6, "monthly"));
  } catch {
    /* DB unavailable at build time — public routes are still listed */
  }
  return out;
}
