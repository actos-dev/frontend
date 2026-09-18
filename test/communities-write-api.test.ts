import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as acceptApplicationRoute } from "@/app/api/communities/[name]/applications/[id]/accept/route";
import { POST as rejectApplicationRoute } from "@/app/api/communities/[name]/applications/[id]/reject/route";
import {
  GET as applicationsGet,
  POST as applyRoute,
} from "@/app/api/communities/[name]/applications/route";
import { POST as closeRoute } from "@/app/api/communities/[name]/close/route";
import { POST as inviteRoute } from "@/app/api/communities/[name]/invitations/route";
import { DELETE as kickRoute } from "@/app/api/communities/[name]/members/[username]/route";
import { PATCH as updateCommunityRoute } from "@/app/api/communities/[name]/route";
import { PUT as successorRoute } from "@/app/api/communities/[name]/successor/route";
import { POST as createCommunityRoute } from "@/app/api/communities/route";
import { POST as acceptInvitationRoute } from "@/app/api/me/invitations/[id]/accept/route";
import { POST as declineInvitationRoute } from "@/app/api/me/invitations/[id]/decline/route";
import { GET as listInvitationsRoute } from "@/app/api/me/invitations/route";
import { POST as postBanRoute } from "@/app/api/mod/bans/route";
import {
  PUT as permissionGrantRoute,
  DELETE as permissionRevokeRoute,
} from "@/app/api/mod/permissions/route";
import { POST as createPostRoute } from "@/app/api/posts/route";
import * as actosLib from "@/lib/actos";
import { GLOBAL_ADMIN_PERMISSIONS } from "@/lib/mod/capabilities";

/**
 * The write half of Phase 7. Browser mutations never touch the API directly;
 * these BFF handlers are the only path, so their contract is what the UI and
 * the real backend have to agree on.
 */
describe("Communities write BFF route handlers", () => {
  const communities = {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    close: vi.fn(),
    setSuccessor: vi.fn(),
    posts: vi.fn(),
    members: vi.fn(),
    kick: vi.fn(),
    invite: vi.fn(),
    applications: vi.fn(),
    apply: vi.fn(),
    acceptApplication: vi.fn(),
    rejectApplication: vi.fn(),
    invitations: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
  };

  const adminWhoami = {
    actor: { id: "u_admin", username: "admin", displayName: "Admin", actorType: "human" },
    permissions: GLOBAL_ADMIN_PERMISSIONS.map((permission) => ({
      permission,
      scope: "global" as const,
      community: null,
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    for (const fn of Object.values(communities)) fn.mockReset();
    vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
      communities,
      auth: { whoami: vi.fn().mockResolvedValue(adminWhoami) },
      admin: { permissions: { grant: vi.fn(), revoke: vi.fn() }, bans: { create: vi.fn() } },
      posts: { create: vi.fn() },
    } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const params = (name: string) => ({ params: Promise.resolve({ name }) });

  describe("POST /api/communities", () => {
    it("creates and normalizes a valid community", async () => {
      communities.create.mockResolvedValue({ id: "m_1", name: "rust" });
      const res = await createCommunityRoute(
        new NextRequest("http://localhost/api/communities", {
          method: "POST",
          body: JSON.stringify({
            name: "  Rust ",
            description: "Systems programming.",
            visibility: "private",
          }),
        }),
      );
      expect(res.status).toBe(201);
      expect(communities.create).toHaveBeenCalledWith({
        name: "rust",
        description: "Systems programming.",
        visibility: "private",
      });
    });

    it("rejects a reserved name without calling the API", async () => {
      const res = await createCommunityRoute(
        new NextRequest("http://localhost/api/communities", {
          method: "POST",
          body: JSON.stringify({ name: "admin", description: "x" }),
        }),
      );
      expect(res.status).toBe(400);
      expect(communities.create).not.toHaveBeenCalled();
    });

    it("rejects a malformed name", async () => {
      const res = await createCommunityRoute(
        new NextRequest("http://localhost/api/communities", {
          method: "POST",
          body: JSON.stringify({ name: "Bad Name!", description: "x" }),
        }),
      );
      expect(res.status).toBe(400);
      expect(communities.create).not.toHaveBeenCalled();
    });

    it("requires a description", async () => {
      const res = await createCommunityRoute(
        new NextRequest("http://localhost/api/communities", {
          method: "POST",
          body: JSON.stringify({ name: "rust" }),
        }),
      );
      expect(res.status).toBe(400);
      expect(communities.create).not.toHaveBeenCalled();
    });

    it("maps the ownership-limit conflict honestly", async () => {
      communities.create.mockRejectedValue({ status: 409, code: "CONFLICT" });
      const res = await createCommunityRoute(
        new NextRequest("http://localhost/api/communities", {
          method: "POST",
          body: JSON.stringify({ name: "rust", description: "x" }),
        }),
      );
      expect(res.status).toBe(409);
    });
  });

  describe("PATCH /api/communities/[name]", () => {
    it("sends a visibility-only patch without a description", async () => {
      communities.update.mockResolvedValue({ id: "m_1", name: "rust", visibility: "private" });
      const res = await updateCommunityRoute(
        new NextRequest("http://localhost/api/communities/rust", {
          method: "PATCH",
          body: JSON.stringify({ visibility: "private" }),
        }),
        params("rust"),
      );
      expect(res.status).toBe(200);
      expect(communities.update).toHaveBeenCalledWith("rust", { visibility: "private" });
    });

    it("passes a private to public attempt through so the API's 400 is shown", async () => {
      communities.update.mockRejectedValue({ status: 400, code: "VALIDATION_FAILED" });
      const res = await updateCommunityRoute(
        new NextRequest("http://localhost/api/communities/rust", {
          method: "PATCH",
          body: JSON.stringify({ visibility: "public" }),
        }),
        params("rust"),
      );
      expect(res.status).toBe(400);
      expect(communities.update).toHaveBeenCalledWith("rust", { visibility: "public" });
    });

    it("requires at least one field", async () => {
      const res = await updateCommunityRoute(
        new NextRequest("http://localhost/api/communities/rust", {
          method: "PATCH",
          body: JSON.stringify({}),
        }),
        params("rust"),
      );
      expect(res.status).toBe(400);
      expect(communities.update).not.toHaveBeenCalled();
    });
  });

  describe("applications", () => {
    it("applies with a reason and answers 201", async () => {
      communities.apply.mockResolvedValue(undefined);
      const res = await applyRoute(
        new NextRequest("http://localhost/api/communities/rust/applications", {
          method: "POST",
          body: JSON.stringify({ reason: "I write Rust." }),
        }),
        params("rust"),
      );
      expect(res.status).toBe(201);
      expect(communities.apply).toHaveBeenCalledWith("rust", {
        reason: "I write Rust.",
      });
    });

    it("requires a reason", async () => {
      const res = await applyRoute(
        new NextRequest("http://localhost/api/communities/rust/applications", {
          method: "POST",
          body: JSON.stringify({ reason: "   " }),
        }),
        params("rust"),
      );
      expect(res.status).toBe(400);
      expect(communities.apply).not.toHaveBeenCalled();
    });

    it("lists the queue with a status filter", async () => {
      communities.applications.mockResolvedValue({ items: [], nextCursor: null });
      const res = await applicationsGet(
        new NextRequest("http://localhost/api/communities/rust/applications?status=accepted"),
        params("rust"),
      );
      expect(res.status).toBe(200);
      expect(communities.applications).toHaveBeenCalledWith("rust", {
        status: "accepted",
        cursor: undefined,
        limit: 25,
      });
    });

    it("rejects an unknown status", async () => {
      const res = await applicationsGet(
        new NextRequest("http://localhost/api/communities/rust/applications?status=maybe"),
        params("rust"),
      );
      expect(res.status).toBe(400);
    });

    it("accepts and rejects applications", async () => {
      communities.acceptApplication.mockResolvedValue(undefined);
      communities.rejectApplication.mockResolvedValue(undefined);

      const acceptRes = await acceptApplicationRoute(
        new NextRequest("http://localhost/api/communities/rust/applications/p_1/accept", {
          method: "POST",
        }),
        { params: Promise.resolve({ name: "rust", id: "p_1" }) },
      );
      expect(acceptRes.status).toBe(204);
      expect(communities.acceptApplication).toHaveBeenCalledWith("rust", "p_1");

      const rejectRes = await rejectApplicationRoute(
        new NextRequest("http://localhost/api/communities/rust/applications/p_2/reject", {
          method: "POST",
        }),
        { params: Promise.resolve({ name: "rust", id: "p_2" }) },
      );
      expect(rejectRes.status).toBe(204);
      expect(communities.rejectApplication).toHaveBeenCalledWith("rust", "p_2");
    });
  });

  describe("members, invitations and lifecycle", () => {
    it("kicks a member", async () => {
      communities.kick.mockResolvedValue(undefined);
      const res = await kickRoute(
        new NextRequest("http://localhost/api/communities/rust/members/spam", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ name: "rust", username: "spam" }) },
      );
      expect(res.status).toBe(204);
      expect(communities.kick).toHaveBeenCalledWith("rust", "spam");
    });

    it("invites a member to a private community", async () => {
      communities.invite.mockResolvedValue(undefined);
      const res = await inviteRoute(
        new NextRequest("http://localhost/api/communities/rust/invitations", {
          method: "POST",
          body: JSON.stringify({ username: "mira" }),
        }),
        params("rust"),
      );
      expect(res.status).toBe(201);
      expect(communities.invite).toHaveBeenCalledWith("rust", { username: "mira" });
    });

    it("closes a community and sets a successor", async () => {
      communities.close.mockResolvedValue(undefined);
      communities.setSuccessor.mockResolvedValue(undefined);

      const closeRes = await closeRoute(
        new NextRequest("http://localhost/api/communities/rust/close", { method: "POST" }),
        params("rust"),
      );
      expect(closeRes.status).toBe(204);
      expect(communities.close).toHaveBeenCalledWith("rust");

      const successorRes = await successorRoute(
        new NextRequest("http://localhost/api/communities/rust/successor", {
          method: "PUT",
          body: JSON.stringify({ username: "mira" }),
        }),
        params("rust"),
      );
      expect(successorRes.status).toBe(204);
      expect(communities.setSuccessor).toHaveBeenCalledWith("rust", { username: "mira" });
    });
  });

  describe("/api/me/invitations", () => {
    it("lists the viewer's invitations", async () => {
      communities.invitations.mockResolvedValue({ items: [], nextCursor: null });
      const res = await listInvitationsRoute(
        new NextRequest("http://localhost/api/me/invitations?limit=10"),
      );
      expect(res.status).toBe(200);
      expect(communities.invitations).toHaveBeenCalledWith({ cursor: undefined, limit: 10 });
    });

    it("accepts and declines", async () => {
      communities.acceptInvitation.mockResolvedValue(undefined);
      communities.declineInvitation.mockResolvedValue(undefined);

      const acceptRes = await acceptInvitationRoute(
        new NextRequest("http://localhost/api/me/invitations/i_1/accept", { method: "POST" }),
        { params: Promise.resolve({ id: "i_1" }) },
      );
      expect(acceptRes.status).toBe(204);
      expect(communities.acceptInvitation).toHaveBeenCalledWith("i_1");

      const declineRes = await declineInvitationRoute(
        new NextRequest("http://localhost/api/me/invitations/i_2/decline", { method: "POST" }),
        { params: Promise.resolve({ id: "i_2" }) },
      );
      expect(declineRes.status).toBe(204);
      expect(communities.declineInvitation).toHaveBeenCalledWith("i_2");
    });
  });

  describe("/api/mod/permissions", () => {
    it("requires an admin for a global grant", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockResolvedValue({
            actor: { id: "u", username: "u", actorType: "human" },
            permissions: [{ permission: "report.view", scope: "global", community: null }],
          }),
        },
      } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);

      const res = await permissionGrantRoute(
        new NextRequest("http://localhost/api/mod/permissions", {
          method: "PUT",
          body: JSON.stringify({ username: "mira", permission: "content.delete" }),
        }),
      );
      expect(res.status).toBe(404);
    });

    it("forwards a community-scoped grant to the API", async () => {
      const grant = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        admin: { permissions: { grant, revoke: vi.fn() } },
      } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);

      const res = await permissionGrantRoute(
        new NextRequest("http://localhost/api/mod/permissions", {
          method: "PUT",
          body: JSON.stringify({ username: "mira", permission: "member.kick", community: "rust" }),
        }),
      );
      expect(res.status).toBe(204);
      expect(grant).toHaveBeenCalledWith({
        username: "mira",
        permission: "member.kick",
        community: "rust",
      });
    });

    it("rejects a community-scoped audit.view grant", async () => {
      const res = await permissionRevokeRoute(
        new NextRequest("http://localhost/api/mod/permissions", {
          method: "DELETE",
          body: JSON.stringify({ username: "mira", permission: "audit.view", community: "rust" }),
        }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe("/api/mod/bans scope rules", () => {
    it("rejects delete-posts without a community scope", async () => {
      const res = await postBanRoute(
        new NextRequest("http://localhost/api/mod/bans", {
          method: "POST",
          body: JSON.stringify({
            username: "spam",
            reason: "spam",
            deletePosts: true,
          }),
        }),
      );
      expect(res.status).toBe(400);
    });

    it("passes a community scope and the delete-posts flag through", async () => {
      const create = vi.fn().mockResolvedValue({});
      const whoami = vi.fn().mockResolvedValue(adminWhoami);
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: { whoami },
        admin: { bans: { create } },
      } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);

      const res = await postBanRoute(
        new NextRequest("http://localhost/api/mod/bans", {
          method: "POST",
          body: JSON.stringify({
            username: "spam",
            reason: "spam",
            community: "rust",
            deletePosts: true,
          }),
        }),
      );
      expect(res.status).toBe(200);
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "spam",
          community: "rust",
          deletePosts: true,
        }),
      );
    });
  });

  describe("/api/posts cross-post creation", () => {
    it("allows a cross-post with no title or body", async () => {
      const create = vi.fn().mockResolvedValue({ id: "c_new", title: null, slug: null });
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        posts: { create },
      } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);

      const res = await createPostRoute(
        new NextRequest("http://localhost/api/posts", {
          method: "POST",
          body: JSON.stringify({ crossPostSource: "c_source", community: "rust" }),
        }),
      );
      expect(res.status).toBe(201);
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ crossPostSource: "c_source", community: "rust" }),
      );
    });

    it("still requires a title and body for a normal post", async () => {
      const res = await createPostRoute(
        new NextRequest("http://localhost/api/posts", {
          method: "POST",
          body: JSON.stringify({ title: "", body: "" }),
        }),
      );
      expect(res.status).toBe(400);
    });
  });
});
