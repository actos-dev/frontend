import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { inviteCommunityMember } from "@/lib/communities/fetchers";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * POST /api/communities/[name]/invitations
 * Invites an actor to a private community. Requires `member.invite` scoped to
 * the community. A public community answers 400 (join is instant there), and a
 * duplicate pending invite answers 409.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const communityName = decodeURIComponent((await params).name || "").trim();
    if (!communityName) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Community name cannot be empty." },
      );
    }

    const body = await req.json().catch(() => ({}));
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    if (!username) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "An invitee username is required." },
      );
    }

    const client = await getServerClient();
    await inviteCommunityMember(client, communityName, username);

    return new NextResponse(null, {
      status: 201,
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
