import type { Metadata } from "next";
import { ModNav } from "@/components/mod/mod-nav";
import { requireModServer } from "@/lib/mod/auth";

export const metadata: Metadata = {
  title: "Moderasyon Paneli — Actos",
  description: "Topluluk denetimi, rapor inceleme ve güvenlik yönetimi.",
};

export const dynamic = "force-dynamic";

export default async function ModLayout({ children }: { children: React.ReactNode }) {
  const { whoami, isAdmin, capabilities } = await requireModServer();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ModNav
        initialUser={{
          username: whoami.actor.username,
          displayName: whoami.actor.displayName,
          role: isAdmin ? "admin" : "moderator",
          roles: whoami.roles,
        }}
        capabilities={capabilities}
      />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
