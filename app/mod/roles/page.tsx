import type { Metadata } from "next";
import { GlobalPermissionsManager } from "@/components/mod/global-permissions-manager";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { requireModServer } from "@/lib/mod/auth";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  return {
    title: `${t("moderation.permissions.title")} — ${t("nav.moderation")}`,
    description: t("moderation.permissions.description"),
  };
}

export const dynamic = "force-dynamic";

export default async function PermissionsPage() {
  // STRICT ADMIN GUARD: only a holder of a global `role.grant` may manage
  // permissions. Unauthorized callers get a 404 (anti-leak).
  await requireModServer(true);

  return (
    <div className="space-y-6" data-testid="permissions-manager-page">
      <GlobalPermissionsManager />
    </div>
  );
}
