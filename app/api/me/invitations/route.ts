import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { listMyInvitations } from "@/lib/communities/fetchers";
import { parseCommunityLimit } from "@/lib/communities/params";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/invitations
 * The signed-in viewer's pending community invitations, newest first.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = parseCommunityLimit(searchParams.get("limit"));
    if (limit === null) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Invalid 'limit' value." },
      );
    }

    const cursor = searchParams.get("cursor") || undefined;
    const client = await getServerClient();
    const page = await listMyInvitations(client, { cursor, limit });

    return NextResponse.json(
      { ok: true, invitations: page.invitations, nextCursor: page.nextCursor },
      { headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
