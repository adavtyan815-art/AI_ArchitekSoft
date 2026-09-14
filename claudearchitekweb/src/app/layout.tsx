import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_Armenian, Noto_Serif_Armenian, Source_Serif_4 } from "next/font/google";
import { cookies, headers } from "next/headers";
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

/** Applies the saved theme before first paint (no flash) and marks the document as JS-capable (scroll reveals). */
const THEME_SCRIPT = `(function(){try{document.documentElement.setAttribute("data-js","1");var c=document.cookie.match(/(?:^|; )theme=(light|dark)/);var t=c?c[1]:localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const lang = h.get("x-locale") || "hy";
  const theme = (await cookies()).get("theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;
  return (
    <html lang={lang} data-theme={dataTheme} className={`${inter.variable} ${serif.variable} ${serifArmenian.variable} ${armenian.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preload" as="image" href="/brand/logo.png" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
