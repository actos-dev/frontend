import type { Application, Community, CommunityMember } from "actos";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityModConsole } from "@/components/communities/community-mod-console";
import { getServerClient } from "@/lib/actos";
import {
  getCommunity,
  listCommunityApplications,
  listCommunityMembers,
} from "@/lib/communities/fetchers";
import { isCommunityCover } from "@/lib/communities/params";
import { communityCapabilities, hasAnyCommunityCapability } from "@/lib/communities/permissions";
import { describeError } from "@/lib/errors";
import { FEATURE_COMMUNITIES } from "@/lib/features";
import { getServerLocale, getTranslations } from "@/lib/i18n";

interface CommunityModPageProps {
  params: Promise<{ name: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CommunityModPageProps): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  const { name } = await params;
  const communityName = decodeURIComponent(name);
  return {
    title: `${t("communities.mod.title", { name: communityName })} — Actos`,
    robots: { index: false, follow: false },
  };
}

/**
 * `/c/[name]/mod`. Access is decided from the viewer's scoped permissions in
 * `whoami` (a global grant also applies), plus ownership — never from a role
 * name. Unauthorized viewers get a 404 so the screen's existence is not leaked;
 * every write still goes through the API's own authorization.
 */
export default async function CommunityModPage({ params }: CommunityModPageProps) {
  if (!FEATURE_COMMUNITIES) notFound();

  const { name } = await params;
  const communityName = decodeURIComponent(name);

  const client = await getServerClient();

  let whoami: Awaited<ReturnType<typeof client.auth.whoami>>;
  try {
    whoami = await client.auth.whoami();
  } catch {
    notFound();
  }

  let community: Community;
  try {
    community = await getCommunity(client, communityName);
  } catch (error) {
    const { status, code } = describeError(error);
    if (status === 404 || code === "NOT_FOUND") notFound();
    throw error;
  }

  // A cover means the viewer is not a member; moderation is never available
  // for a community they cannot see inside.
  if (isCommunityCover(community)) notFound();

  const isOwner = community.owner.username === whoami.actor.username;
  const capabilities = communityCapabilities(whoami.permissions, communityName, isOwner);
  if (!hasAnyCommunityCapability(capabilities)) notFound();

  let members: CommunityMember[] = [];
  let membersCursor: string | null = null;
  if (capabilities.canKick || capabilities.canBan) {
    try {
      const page = await listCommunityMembers(client, communityName, { limit: 25 });
      members = page.members;
      membersCursor = page.nextCursor;
    } catch {
      members = [];
    }
  }

  let applications: Application[] = [];
  let applicationsCursor: string | null = null;
  if (capabilities.canApprove) {
    try {
      const page = await listCommunityApplications(client, communityName, {
        status: "pending",
        limit: 25,
      });
      applications = page.applications;
      applicationsCursor = page.nextCursor;
    } catch {
      applications = [];
    }
  }

  const { t } = getTranslations(await getServerLocale());

  return (
    <div className="px-4 py-6 sm:px-6">
      <header className="mb-6 space-y-1.5 border-b border-border pb-4">
        <Link
          href={`/c/${encodeURIComponent(communityName)}`}
          className="text-xs font-medium text-fg-muted hover:text-accent-text"
        >
          {`← ${t("communities.mod.back", { name: communityName })}`}
        </Link>
        <h1 className="font-serif text-2xl font-semibold text-fg">
          {t("communities.mod.title", { name: communityName })}
        </h1>
      </header>

      <CommunityModConsole
        community={{
          name: community.name,
          description: community.description,
          visibility: community.visibility,
          ownerUsername: community.owner.username,
        }}
        capabilities={capabilities}
        currentUsername={whoami.actor.username}
        initialMembers={members}
        initialMembersCursor={membersCursor}
        initialApplications={applications}
        initialApplicationsCursor={applicationsCursor}
      />
    </div>
  );
}
