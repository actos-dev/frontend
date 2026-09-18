import type { Community } from "actos";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityDirectory } from "@/components/communities/community-directory";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { getServerClient } from "@/lib/actos";
import { listCommunities } from "@/lib/communities/fetchers";
import { describeError } from "@/lib/errors";
import { FEATURE_COMMUNITIES } from "@/lib/features";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  const siteUrl = getSiteUrl();
  return {
    title: `${t("communities.title")} — Actos`,
    description: t("communities.meta_description"),
    alternates: { canonical: `${siteUrl}/c` },
  };
}

/**
 * The public community directory (`/c`), newest first (BE-017: the 0.3.0 API
 * has no search or sort, so this page does not offer one).
 */
export default async function CommunityDirectoryPage() {
  // The read half stays dark until it is verified against the real backend
  // (ROADMAP §3); flipping FEATURE_COMMUNITIES turns the screens on.
  if (!FEATURE_COMMUNITIES) notFound();

  const { t } = getTranslations(await getServerLocale());

  let communities: Community[] = [];
  let nextCursor: string | null = null;
  let loadError: unknown = null;

  try {
    const client = await getServerClient();
    const page = await listCommunities(client, { limit: 25 });
    communities = page.communities;
    nextCursor = page.nextCursor;
  } catch (error) {
    // No fabricated communities (ROADMAP.md P0-02, decision 7).
    loadError = error;
  }

  return (
    <div>
      <div className="border-b border-border px-4 py-5 sm:px-6">
        <h1 className="font-serif text-2xl font-semibold text-fg sm:text-3xl">
          {t("communities.title")}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">{t("communities.description")}</p>
      </div>

      {loadError ? (
        <div className="p-6 sm:p-10">
          <ErrorStateRetry {...describeError(loadError)} />
        </div>
      ) : (
        <CommunityDirectory initialCommunities={communities} initialNextCursor={nextCursor} />
      )}
    </div>
  );
}
