import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/components/session-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_THEME, isValidTheme, type ThemeName } from "@/lib/themes";
import "./globals.css";

const siteUrl = process.env.ACTOS_SITE_URL || "https://actos.com.tr";

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
    images: ["/opengraph-image"],
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

  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        <TooltipProvider delayDuration={200}>
          <SessionProvider>
            <AppShell>{children}</AppShell>
          </SessionProvider>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
