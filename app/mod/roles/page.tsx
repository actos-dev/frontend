import type { Metadata } from "next";
import { RolesManager } from "@/components/mod/roles-manager";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { requireModServer } from "@/lib/mod/auth";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  return {
    title: `${t("moderation.pages.role_management")} — ${t("nav.moderation")}`,
    description: t("moderation.roles.description"),
  };
}

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  // STRICT ADMIN GUARD: If caller is not an admin, immediately triggers 404 (anti-leak)
  await requireModServer(true);

  return (
    <div className="space-y-6" data-testid="roles-manager-page">
      <RolesManager />
    </div>
  );
}
