import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getServerLocale, getTranslations } from "@/lib/i18n";

/**
 * 404 page (ROADMAP.md S-06): text-first, no icon circle, one action, fully
 * localized. Kept as a Server Component (no interactivity needed) so the
 * server can render it directly in the requested locale.
 */
export default async function NotFound() {
  const locale = await getServerLocale();
  const { t } = getTranslations(locale);

  return (
    <div
      role="status"
      aria-labelledby="not-found-heading"
      className="flex flex-col items-center justify-center text-center px-6 py-20 sm:py-28 max-w-md mx-auto min-h-[50vh]"
    >
      <p className="font-mono text-xs uppercase tracking-wider text-fg-subtle mb-3">404</p>
      <h1
        id="not-found-heading"
        className="text-2xl sm:text-3xl font-semibold font-serif text-fg tracking-tight mb-3"
      >
        {t("errorPages.notFoundTitle")}
      </h1>
      <p className="text-sm text-fg-muted leading-relaxed mb-8">
        {t("errorPages.notFoundDescription")}
      </p>
      <Button asChild size="md">
        <Link href="/">{t("errorPages.backToFeed")}</Link>
      </Button>
    </div>
  );
}
