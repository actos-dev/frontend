import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { SkipToContent } from "@/components/layout/skip-to-content";
import { SessionProvider } from "@/components/session-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_LOCALE, I18nProvider, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { getPopularTags } from "@/lib/tags";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;
  const theme: ThemeName = themeCookie && isValidTheme(themeCookie) ? themeCookie : DEFAULT_THEME;

  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value || cookieStore.get("locale")?.value;
  const locale: Locale = localeCookie && isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;

  // Real popular-tags data for the right rail (P0-05); null on any fetch error,
  // never invented data. Cached 5 minutes via unstable_cache in lib/tags.ts.
  const popularTags = await getPopularTags();

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
              <AppShell popularTags={popularTags}>{children}</AppShell>
            </SessionProvider>
            <Toaster />
          </I18nProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
