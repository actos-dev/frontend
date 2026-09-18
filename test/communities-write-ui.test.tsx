// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Application, Community, CommunityMember, Post } from "actos";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/c/rust",
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// The screens are dark by default; these tests flip the flag on (ROADMAP §3).
vi.mock("@/lib/features", () => ({ FEATURE_COMMUNITIES: true }));

import { ApplyToJoinForm } from "@/components/communities/apply-to-join-form";
import { CommunityCreateForm } from "@/components/communities/community-create-form";
import { ApplicationsQueue } from "@/components/communities/mod/applications-queue";
import { CommunityPermissions } from "@/components/communities/mod/community-permissions";
import { MembersManager } from "@/components/communities/mod/members-manager";
import { SettingsForm } from "@/components/communities/mod/settings-form";
import { PostRowMenu } from "@/components/feed/post-row-menu";
import { NotificationCard } from "@/components/inbox/notification-card";
import { BanDialog } from "@/components/mod/ban-dialog";
import { getDictionary } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";
import { renderWithQueryClient } from "@/test/query-test-utils";

const en = getDictionary("en");
const t = (key: string, params?: Record<string, string | number>) => {
  const parts = key.split(".");
  // biome-ignore lint/suspicious/noExplicitAny: test-only dictionary walk
  let current: any = en;
  for (const part of parts) current = current?.[part];
  if (typeof current !== "string") return key;
  let text = current;
  if (params)
    for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
};

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: "c_post_1",
    contentType: "post",
    isCrossPost: false,
    title: "Hello",
    body: "Body",
    bodyHtml: "<p>Body</p>",
    bodyFormat: "markdown",
    score: 1,
    upvotes: 1,
    downvotes: 0,
    commentCount: 0,
    tags: [],
    authorDeleted: false,
    deleted: false,
    createdAt: "2026-09-01T00:00:00Z",
    editedAt: null,
    author: {
      id: "u_author",
      username: "mira",
      displayName: "Mira",
      actorType: "human",
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00Z",
    },
    ...overrides,
  };
}

function makeMember(username: string): CommunityMember {
  return {
    actor: {
      id: `u_${username}`,
      username,
      displayName: username,
      actorType: "human",
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00Z",
    },
    joinedAt: "2026-02-01T00:00:00Z",
  };
}

function makeApplication(id: string): Application {
  return {
    id,
    community: { id: "m_rust", name: "rust" },
    applicant: {
      id: "u_applicant",
      username: "mira",
      displayName: "Mira",
      actorType: "human",
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00Z",
    },
    reason: "I write Rust.",
    status: "pending",
    createdAt: "2026-09-01T00:00:00Z",
    resolvedAt: null,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("Phase 7 communities — write and moderation flows", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({ status: "authenticated", user: null });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("community create validation", () => {
    it("flags a reserved name and disables submit", () => {
      render(<CommunityCreateForm />);
      fireEvent.change(screen.getByTestId("community-name-input"), {
        target: { value: "admin" },
      });
      expect(screen.getByTestId("community-name-status").textContent).toBe(
        t("communities.create_form.name_error_reserved"),
      );
      expect(screen.getByTestId("community-create-submit")).toBeDisabled();
    });

    it("flags a malformed name", () => {
      render(<CommunityCreateForm />);
      fireEvent.change(screen.getByTestId("community-name-input"), { target: { value: "ab" } });
      expect(screen.getByTestId("community-name-status").textContent).toBe(
        t("communities.create_form.name_error_invalid"),
      );
      expect(screen.getByTestId("community-create-submit")).toBeDisabled();
    });

    it("warns that private is a one-way choice", () => {
      render(<CommunityCreateForm />);
      expect(screen.getByTestId("private-visibility-warning").textContent).toBe(
        t("communities.create_form.private_warning"),
      );
    });
  });

  describe("private cover apply", () => {
    it("submits a reason and shows the pending state on the page", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 201));
      render(<ApplyToJoinForm name="rust" />);

      fireEvent.change(screen.getByTestId("apply-reason-input"), {
        target: { value: "Let me in." },
      });
      fireEvent.click(screen.getByTestId("apply-submit"));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/communities/rust/applications",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ reason: "Let me in." }),
          }),
        );
        expect(screen.getByTestId("apply-pending")).toBeDefined();
      });
    });

    it("treats a 409 as already pending", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ code: "CONFLICT" }, 409));
      render(<ApplyToJoinForm name="rust" />);
      fireEvent.change(screen.getByTestId("apply-reason-input"), {
        target: { value: "again" },
      });
      fireEvent.click(screen.getByTestId("apply-submit"));
      await waitFor(() => expect(screen.getByTestId("apply-pending")).toBeDefined());
    });
  });

  describe("applications queue", () => {
    it("approves a pending application", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 204));
      render(
        <ApplicationsQueue
          communityName="rust"
          initialApplications={[makeApplication("p_1")]}
          initialNextCursor={null}
        />,
      );

      expect(screen.getByTestId("application-row-p_1")).toBeDefined();
      fireEvent.click(screen.getByTestId("application-approve-p_1"));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/communities/rust/applications/p_1/accept",
          expect.objectContaining({ method: "POST" }),
        );
        expect(screen.queryByTestId("application-row-p_1")).toBeNull();
      });
    });

    it("rejects a pending application", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 204));
      render(
        <ApplicationsQueue
          communityName="rust"
          initialApplications={[makeApplication("p_2")]}
          initialNextCursor={null}
        />,
      );
      fireEvent.click(screen.getByTestId("application-reject-p_2"));
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/communities/rust/applications/p_2/reject",
          expect.objectContaining({ method: "POST" }),
        );
      });
    });
  });

  describe("members kick", () => {
    it("kicks a member after confirmation", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 204));
      render(
        <MembersManager
          communityName="rust"
          initialMembers={[makeMember("ada"), makeMember("mira")]}
          initialNextCursor={null}
          ownerUsername="ada"
          canKick
          canBan={false}
          onBan={vi.fn()}
        />,
      );

      // The owner cannot be kicked.
      expect(screen.queryByTestId("member-kick-ada")).toBeNull();
      fireEvent.click(screen.getByTestId("member-kick-mira"));
      fireEvent.click(await screen.findByTestId("confirm-kick-button"));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/communities/rust/members/mira",
          expect.objectContaining({ method: "DELETE" }),
        );
        expect(screen.queryByTestId("member-row-mira")).toBeNull();
      });
    });
  });

  describe("community permission grants", () => {
    it("grants a scoped permission with the community name", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 204));
      render(<CommunityPermissions communityName="rust" canGrant />);

      fireEvent.change(screen.getByTestId("permission-username-input"), {
        target: { value: "mira" },
      });
      fireEvent.change(screen.getByTestId("permission-select"), {
        target: { value: "member.kick" },
      });
      fireEvent.click(screen.getByTestId("permission-grant-button"));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/mod/permissions",
          expect.objectContaining({
            method: "PUT",
            body: JSON.stringify({
              username: "mira",
              permission: "member.kick",
              community: "rust",
            }),
          }),
        );
      });
    });

    it("revokes through DELETE", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 204));
      render(<CommunityPermissions communityName="rust" canGrant />);
      fireEvent.change(screen.getByTestId("permission-username-input"), {
        target: { value: "mira" },
      });
      fireEvent.click(screen.getByTestId("permission-revoke-button"));
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/mod/permissions",
          expect.objectContaining({ method: "DELETE" }),
        );
      });
    });
  });

  describe("settings one-way visibility and close", () => {
    const community: Pick<Community, "name" | "description" | "visibility"> = {
      name: "rust",
      description: "Systems programming.",
      visibility: "public",
    };

    it("sends a visibility-only patch and warns it cannot be undone", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 200));
      render(<SettingsForm community={community} canEdit canClose isOwner={false} />);

      expect(screen.getByTestId("visibility-warning").textContent).toBe(
        t("communities.mod.settings.private_warning"),
      );
      fireEvent.click(screen.getByTestId("make-private-button"));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/communities/rust",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ visibility: "private" }),
          }),
        );
      });
    });

    it("keeps close disabled until the exact name is typed", () => {
      render(<SettingsForm community={community} canEdit canClose isOwner={false} />);
      const closeButton = screen.getByTestId("close-community-button");
      expect(closeButton).toBeDisabled();
      fireEvent.change(screen.getByTestId("close-confirm-input"), {
        target: { value: "rus" },
      });
      expect(closeButton).toBeDisabled();
      fireEvent.change(screen.getByTestId("close-confirm-input"), {
        target: { value: "rust" },
      });
      expect(closeButton).not.toBeDisabled();
    });
  });

  describe("ban dialog scope rules", () => {
    it("only offers delete-posts with a community scope", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 200));
      render(
        <BanDialog
          open
          onOpenChange={vi.fn()}
          defaultUsername="spam"
          communityName="rust"
          defaultScope="global"
        />,
      );

      expect(screen.getByTestId("ban-scope-community")).toBeDefined();
      expect(screen.queryByTestId("ban-delete-posts")).toBeNull();

      fireEvent.click(screen.getByTestId("ban-scope-community"));
      expect(await screen.findByTestId("ban-delete-posts")).toBeDefined();

      fireEvent.change(screen.getByTestId("ban-reason-input"), { target: { value: "spam" } });
      fireEvent.click(await screen.findByTestId("ban-delete-posts"));
      fireEvent.click(screen.getByTestId("confirm-ban-submit-button"));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/mod/bans",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining('"community":"rust"'),
          }),
        );
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/mod/bans",
          expect.objectContaining({ body: expect.stringContaining('"deletePosts":true') }),
        );
      });
    });

    it("offers no community scope when there is no community", () => {
      render(<BanDialog open onOpenChange={vi.fn()} />);
      expect(screen.queryByTestId("ban-scope-community")).toBeNull();
      expect(screen.queryByTestId("ban-delete-posts")).toBeNull();
    });
  });

  describe("cross-post action availability", () => {
    it("shows Cross-post for a normal post but not for a cross-post", async () => {
      const { unmount } = renderWithQueryClient(<PostRowMenu post={makePost()} isAuthor={false} />);
      fireEvent.click(screen.getByRole("button", { name: t("postCard.more_actions") }));
      expect(await screen.findByTestId("row-cross-post-button")).toBeDefined();
      unmount();

      renderWithQueryClient(
        <PostRowMenu
          post={makePost({ isCrossPost: true, title: null, body: "" })}
          isAuthor={false}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: t("postCard.more_actions") }));
      expect(screen.queryByTestId("row-cross-post-button")).toBeNull();
    });
  });

  describe("inbox community kinds", () => {
    it("renders inline accept/decline for a community invitation", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 204));
      render(
        <NotificationCard
          notification={{
            id: "n_1",
            kind: "community_invitation",
            actor: { id: "u_1", username: "mira", displayName: "Mira", actorType: "human" },
            targetType: "invitation",
            targetId: "i_1",
            payload: { invitation_id: "i_1", community: { name: "rust" } },
            createdAt: "2026-09-01T00:00:00Z",
            readAt: null,
          }}
        />,
      );

      expect(screen.getByTestId("inbox-invitation-accept")).toBeDefined();
      fireEvent.click(screen.getByTestId("inbox-invitation-accept"));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/me/invitations/i_1/accept",
          expect.objectContaining({ method: "POST" }),
        );
      });
    });

    it("renders a community application row without crashing", () => {
      render(
        <NotificationCard
          notification={{
            id: "n_2",
            kind: "community_application",
            actor: { id: "u_2", username: "dila", displayName: "Dila", actorType: "ai_agent" },
            targetType: "content",
            targetId: "p_1",
            payload: { community_name: "rust" },
            createdAt: "2026-09-01T00:00:00Z",
            readAt: null,
          }}
        />,
      );
      expect(screen.getByText(t("inbox.actions.community_application"))).toBeDefined();
      expect(screen.getByTestId("notification-card").getAttribute("href")).toBe("/c/rust");
    });
  });
});
