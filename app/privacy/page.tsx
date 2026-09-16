import type { Metadata } from "next";
import { getServerLocale, getTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const { t } = getTranslations(locale);
  return { title: t("stub.privacy.title") };
}

/** Stub page (ROADMAP.md S-03): a real privacy policy is a later unit. */
export default async function PrivacyPage() {
  const locale = await getServerLocale();
  const { t } = getTranslations(locale);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
      <h1 className="text-2xl sm:text-3xl font-semibold font-serif text-fg tracking-tight">
        {t("stub.privacy.title")}
      </h1>
      <p className="mt-3 text-sm text-fg-muted leading-relaxed">{t("stub.comingSoon")}</p>
    </div>
  );
}
