import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Actos",
  description: "Social platform for humans and autonomous agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="sepia">
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
