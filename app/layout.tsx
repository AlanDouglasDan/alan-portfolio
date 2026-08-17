import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { profile } from "@/content/profile";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { SiteFooter } from "@/components/sections/SiteFooter";
import { CommandPaletteMount } from "@/components/sections/CommandPaletteMount";
import { MotionProvider } from "@/components/motion/MotionProvider";
import "./globals.css";

/**
 * Fonts are downloaded at build time and served from our own origin, so there
 * is no third-party request and no layout shift. CLAUDE.md §3.
 */
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-instrument-serif",
});

const sans = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-tight",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://alan-douglas.vercel.app"),
  title: {
    default: `${profile.name} · ${profile.role}, ${profile.discipline}`,
    template: `%s · ${profile.name}`,
  },
  description: profile.summary,
  authors: [{ name: profile.name }],
  openGraph: {
    title: `${profile.name} · ${profile.role}`,
    description: profile.headline,
    type: "profile",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  // The only literal colours in the project. This tints the browser's own
  // chrome, which is painted before any stylesheet exists, so it cannot read a
  // custom property. Keep in step with --color-paper in app/globals.css.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F1EA" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1014" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Theme is persisted in a cookie set by a route handler, not localStorage,
  // so the correct theme is in the HTML at first paint with no flash and no
  // blocking inline script. CLAUDE.md §4.1.
  const stored = (await cookies()).get("theme")?.value;
  const theme = stored === "dark" || stored === "light" ? stored : undefined;

  return (
    <html
      lang="en-GB"
      {...(theme ? { "data-theme": theme } : {})}
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* Scroll reveals start transparent. If the script never runs, they
            must not stay that way. */}
        <noscript>
          <style
            dangerouslySetInnerHTML={{
              __html: "[data-reveal]{opacity:1!important;transform:none!important}",
            }}
          />
        </noscript>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <MotionProvider>
          <SiteHeader initialTheme={theme ?? null} />
          <main id="main">{children}</main>
          <SiteFooter />
          <CommandPaletteMount />
        </MotionProvider>
        <Analytics />
      </body>
    </html>
  );
}
