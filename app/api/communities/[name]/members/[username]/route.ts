import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { kickCommunityMember } from "@/lib/communities/fetchers";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ name: string; username: string }>;
}

/**
 * DELETE /api/communities/[name]/members/[username]
 * Kicks a member. Requires `member.kick` scoped to the community; the owner
 * cannot be kicked and a non-member answers 404.
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const resolved = await params;
    const communityName = decodeURIComponent(resolved.name || "").trim();
    const username = decodeURIComponent(resolved.username || "").trim();

    if (!communityName || !username) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Community name and username are required." },
      );
    }

    const client = await getServerClient();
    await kickCommunityMember(client, communityName, username);

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
