import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Noto_Sans_Armenian } from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope", display: "swap", weight: ["500", "600", "700", "800"] });
const armenian = Noto_Sans_Armenian({ subsets: ["armenian"], variable: "--font-armenian", display: "swap", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "ArchiTek Soft — KitchenPro",
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
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e10" },
  ],
};

/** Applies the saved theme before first paint (no flash). Cookie wins (SSR), then localStorage. */
const THEME_SCRIPT = `(function(){try{var c=document.cookie.match(/(?:^|; )theme=(light|dark)/);var t=c?c[1]:localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const lang = h.get("x-locale") || "hy";
  const theme = (await cookies()).get("theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;
  return (
    <html lang={lang} data-theme={dataTheme} className={`${inter.variable} ${manrope.variable} ${armenian.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
