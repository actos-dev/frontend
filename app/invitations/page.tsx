import type { Invitation } from "actos";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvitationsView } from "@/components/communities/invitations-view";
import { Button } from "@/components/ui/button";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { getServerClient, hasSessionCookie } from "@/lib/actos";
import { listMyInvitations } from "@/lib/communities/fetchers";
import { describeError } from "@/lib/errors";
import { FEATURE_COMMUNITIES } from "@/lib/features";
import { getServerLocale, getTranslations } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  return {
    title: `${t("invitationsPage.title")} — Actos`,
    description: t("invitationsPage.description"),
  };
}

/**
 * `/invitations` — the viewer's pending community invitations. The inbox
 * renders the same invitations with inline actions; this page is the stable
 * list for someone who dismissed the inbox item.
 */
export default async function InvitationsPage() {
  if (!FEATURE_COMMUNITIES) notFound();

  const { t } = getTranslations(await getServerLocale());

  if (!(await hasSessionCookie())) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="font-serif text-2xl font-semibold text-fg">
          {t("invitationsPage.anonymous_title")}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">{t("invitationsPage.anonymous_description")}</p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/login?returnUrl=/invitations">{t("invitationsPage.login_button")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  let invitations: Invitation[] = [];
  let nextCursor: string | null = null;
  let loadError: unknown = null;

  try {
    const client = await getServerClient();
    const page = await listMyInvitations(client, { limit: 25 });
    invitations = page.invitations;
    nextCursor = page.nextCursor;
  } catch (error) {
    loadError = error;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-4 border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-semibold text-fg">{t("invitationsPage.title")}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t("invitationsPage.description")}</p>
      </header>

      {loadError ? (
        <ErrorStateRetry {...describeError(loadError)} />
      ) : (
        <InvitationsView initialInvitations={invitations} initialNextCursor={nextCursor} />
      )}
    </div>
  );
}
