import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type React from "react";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ACTOS_TOKEN_COOKIE, getServerClient } from "@/lib/actos";
import { getServerLocale, getTranslations } from "@/lib/i18n";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACTOS_TOKEN_COOKIE)?.value;

  if (!token) {
    redirect("/login?returnUrl=/settings");
  }

  try {
    const client = await getServerClient();
    await client.auth.whoami();
  } catch {
    redirect("/login?returnUrl=/settings");
  }

  const { t } = getTranslations(await getServerLocale());

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-serif">
          {t("settings.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>

      <SettingsNav />

      <div>{children}</div>
    </div>
  );
}
