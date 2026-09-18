import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_Armenian, Noto_Serif_Armenian, Source_Serif_4 } from "next/font/google";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { ADMIN_LANG_COOKIE, isAdminLocale } from "@/lib/i18n/admin";
import { THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

/**
 * Type system v3: serif display (Source Serif 4 + Noto Serif Armenian), grotesk body
 * (Inter + Noto Sans Armenian), mono details (JetBrains Mono). All self-hosted by next/font.
 */
const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin", "cyrillic"], variable: "--font-serif", display: "swap", axes: ["opsz"] });
const serifArmenian = Noto_Serif_Armenian({ subsets: ["armenian"], variable: "--font-serif-armenian", display: "swap" });
const armenian = Noto_Sans_Armenian({ subsets: ["armenian"], variable: "--font-armenian", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "ArchiTek Soft — 3D for furniture",
  description: "Choose colours, materials and forms with confidence, in interactive 3D, before the furniture is produced.",
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3100"),
  icons: { icon: "/brand/favicon.png", apple: "/brand/apple-touch-icon.png" },
  openGraph: { siteName: "ArchiTek Soft", images: ["/brand/share.jpg"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f2ed" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

/**
 * Language of the document on a full page load.
 * - Public site: the locale the middleware resolved from the URL (`x-locale`).
 * - Admin: the interface language the user chose (`admin_lang` cookie); the URL carries no locale there.
 * Both values are checked against the known locales, so a forged header can never reach the markup.
 * Layouts below keep `<html lang>` in step after client-side navigation (see components/site/html-lang.tsx).
 */
function documentLang(h: Headers, adminLang: string | undefined): string {
  const siteLocale = h.get("x-locale");
  if (isLocale(siteLocale)) return siteLocale;
  const pathname = h.get("x-pathname") ?? "";
  if ((pathname === "/admin" || pathname.startsWith("/admin/")) && isAdminLocale(adminLang)) return adminLang;
  return DEFAULT_LOCALE;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const jar = await cookies();
  const lang = documentLang(h, jar.get(ADMIN_LANG_COOKIE)?.value);
  const theme = jar.get("theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;
  return (
    <html lang={lang} data-theme={dataTheme} className={`${inter.variable} ${serif.variable} ${serifArmenian.variable} ${armenian.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preload" as="image" href="/brand/logo.png" />
        {/* No nonce on purpose: the CSP allows this one by hash, so nothing on the tag changes
            between the server render and the browser. See src/lib/theme-script.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
