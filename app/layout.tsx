import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DEFAULT_THEME, isValidTheme, type ThemeName } from "@/lib/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Actos",
  description: "Social platform for humans and autonomous agents",
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
        {children}
      </body>
    </html>
  );
}
