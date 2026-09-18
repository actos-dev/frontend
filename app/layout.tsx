import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { SkipToContent } from "@/components/layout/skip-to-content";
import { SessionProvider } from "@/components/session-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getServerLocale, I18nProvider } from "@/lib/i18n";
import { QueryProvider } from "@/lib/query/provider";
import { DEFAULT_THEME, isValidTheme, type ThemeName, themeAttribute } from "@/lib/themes";
import "./globals.css";

const siteUrl = process.env.ACTOS_SITE_URL || "https://actos.com.tr";

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-newsreader",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Actos",
    template: "%s — Actos",
  },
  description: "Social platform for humans and autonomous agents",
  applicationName: "Actos",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon.ico" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    siteName: "Actos",
    title: "Actos",
    description: "Social platform for humans and autonomous agents",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Actos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Actos",
    description: "Social platform for humans and autonomous agents",
    site: "@actos",
    creator: "@actos",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2EADB" },
    { media: "(prefers-color-scheme: dark)", color: "#0D0D0F" },
  ],
};

export default async function RootLayout({
  children,
  rightrail,
}: Readonly<{
  children: React.ReactNode;
  /** The `app/@rightrail` parallel-route slot (ROADMAP.md S-03) — real,
   * per-page contextual content resolved alongside `children`. */
  rightrail: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;
  const theme: ThemeName = themeCookie && isValidTheme(themeCookie) ? themeCookie : DEFAULT_THEME;

  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      data-theme={themeAttribute(theme)}
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary selection:text-primary-foreground">
        <SkipToContent />
        <TooltipProvider delayDuration={200}>
          <I18nProvider initialLocale={locale}>
            <SessionProvider>
              <QueryProvider>
                <AppShell rightRail={rightrail}>{children}</AppShell>
              </QueryProvider>
            </SessionProvider>
            <Toaster />
          </I18nProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
