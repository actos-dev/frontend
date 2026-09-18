import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityCreateForm } from "@/components/communities/community-create-form";
import { Button } from "@/components/ui/button";
import { hasSessionCookie } from "@/lib/actos";
import { FEATURE_COMMUNITIES } from "@/lib/features";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  const siteUrl = getSiteUrl();
  return {
    title: `${t("communities.create_form.title")} — Actos`,
    description: t("communities.create_form.subtitle"),
    alternates: { canonical: `${siteUrl}/c/new` },
  };
}

export default async function CommunityCreatePage() {
  if (!FEATURE_COMMUNITIES) notFound();

  const { t } = getTranslations(await getServerLocale());

  if (!(await hasSessionCookie())) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="font-serif text-2xl font-semibold text-fg">
          {t("communities.create_form.title")}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">{t("communities.create_form.subtitle")}</p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/login?returnUrl=/c/new">{t("nav.login")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6">
      <header className="mx-auto mb-8 max-w-2xl space-y-1.5">
        <Link href="/c" className="text-xs font-medium text-fg-muted hover:text-accent-text">
          {`← ${t("communities.create_form.back")}`}
        </Link>
        <h1 className="font-serif text-2xl font-semibold text-fg sm:text-3xl">
          {t("communities.create_form.title")}
        </h1>
        <p className="text-sm text-fg-muted">{t("communities.create_form.subtitle")}</p>
      </header>
      <CommunityCreateForm />
    </div>
  );
}
