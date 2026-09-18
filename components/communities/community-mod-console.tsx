"use client";

import type { Application, CommunityMember } from "actos";
import { useState } from "react";
import { ApplicationsQueue } from "@/components/communities/mod/applications-queue";
import { CommunityPermissions } from "@/components/communities/mod/community-permissions";
import { InviteForm } from "@/components/communities/mod/invite-form";
import { MembersManager } from "@/components/communities/mod/members-manager";
import { SettingsForm } from "@/components/communities/mod/settings-form";
import { BanDialog } from "@/components/mod/ban-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CommunityCapabilities } from "@/lib/communities/permissions";
import { useTranslation } from "@/lib/i18n";

type ModTab = "applications" | "members" | "invitations" | "settings" | "permissions";

export interface CommunityModConsoleProps {
  community: {
    name: string;
    description: string;
    visibility: string;
    ownerUsername: string;
  };
  capabilities: CommunityCapabilities;
  currentUsername: string;
  initialMembers: CommunityMember[];
  initialMembersCursor: string | null;
  initialApplications: Application[];
  initialApplicationsCursor: string | null;
}

/**
 * `/c/[name]/mod` in one client island. Tabs are derived from the viewer's
 * scoped capabilities, not from a role name; a capability the viewer lacks
 * simply does not appear (the API still enforces every write). The ban dialog
 * is scoped to this community by default but can still be sent global if the
 * viewer also holds a global `member.ban`.
 */
export function CommunityModConsole({
  community,
  capabilities,
  currentUsername,
  initialMembers,
  initialMembersCursor,
  initialApplications,
  initialApplicationsCursor,
}: CommunityModConsoleProps) {
  const { t } = useTranslation();
  const tabs: ModTab[] = [];
  if (capabilities.canApprove) tabs.push("applications");
  if (capabilities.canKick || capabilities.canBan) tabs.push("members");
  if (capabilities.canInvite) tabs.push("invitations");
  if (capabilities.canEdit || capabilities.canClose) tabs.push("settings");
  if (capabilities.canGrant) tabs.push("permissions");

  const [activeTab, setActiveTab] = useState<ModTab>(tabs[0] ?? "members");
  const [banUsername, setBanUsername] = useState<string | null>(null);

  return (
    <div className="space-y-6" data-testid="community-mod-console">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ModTab)}>
        <TabsList className="flex w-full flex-wrap">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              data-testid={`community-mod-tab-${tab}`}
              className="text-xs"
            >
              {t(`communities.mod.tabs.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {activeTab === "applications" && capabilities.canApprove ? (
        <ApplicationsQueue
          communityName={community.name}
          initialApplications={initialApplications}
          initialNextCursor={initialApplicationsCursor}
        />
      ) : null}

      {activeTab === "members" ? (
        <MembersManager
          communityName={community.name}
          initialMembers={initialMembers}
          initialNextCursor={initialMembersCursor}
          ownerUsername={community.ownerUsername}
          canKick={capabilities.canKick}
          canBan={capabilities.canBan}
          onBan={(username) => setBanUsername(username)}
        />
      ) : null}

      {activeTab === "invitations" && capabilities.canInvite ? (
        <InviteForm communityName={community.name} isPrivate={community.visibility === "private"} />
      ) : null}

      {activeTab === "settings" ? (
        <SettingsForm
          community={community}
          canEdit={capabilities.canEdit}
          canClose={capabilities.canClose}
          isOwner={community.ownerUsername === currentUsername}
        />
      ) : null}

      {activeTab === "permissions" && capabilities.canGrant ? (
        <CommunityPermissions communityName={community.name} canGrant={capabilities.canGrant} />
      ) : null}

      <BanDialog
        key={banUsername ?? "no-author"}
        open={Boolean(banUsername)}
        onOpenChange={(open) => {
          if (!open) setBanUsername(null);
        }}
        defaultUsername={banUsername ?? ""}
        communityName={community.name}
        defaultScope="community"
      />
    </div>
  );
}
