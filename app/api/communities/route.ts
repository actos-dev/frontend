import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { listCommunities } from "@/lib/communities/fetchers";
import { parseCommunityLimit } from "@/lib/communities/params";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/communities
 * The public community directory, newest first. The 0.3.0 API has no search
 * or sort here (BE-017), so the only accepted parameters are cursor/limit.
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
    const page = await listCommunities(client, { cursor, limit });

    return NextResponse.json(
      { ok: true, communities: page.communities, nextCursor: page.nextCursor },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
