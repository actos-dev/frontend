import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type React from "react";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ACTOS_TOKEN_COOKIE, getServerClient, SESSION_TOKEN_COOKIE } from "@/lib/actos";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(ACTOS_TOKEN_COOKIE)?.value || cookieStore.get(SESSION_TOKEN_COOKIE)?.value;

  if (!token) {
    redirect("/login?returnUrl=/settings");
  }

  try {
    const client = await getServerClient();
    await client.auth.whoami();
  } catch {
    redirect("/login?returnUrl=/settings");
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-serif">
          Ayarlar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hesap, profil ve güvenlik tercihlerinizi yönetin.
        </p>
      </div>

      <SettingsNav />

      <div>{children}</div>
    </div>
  );
}
