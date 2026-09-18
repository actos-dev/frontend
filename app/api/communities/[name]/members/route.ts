import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { listCommunityMembers } from "@/lib/communities/fetchers";
import { parseCommunityLimit } from "@/lib/communities/params";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * GET /api/communities/[name]/members
 * The member list, oldest-join first. Private responses are never cached:
 * the API gates the inside of a private community to its members, so this
 * response is viewer-specific.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const communityName = decodeURIComponent(name || "").trim();
    if (!communityName) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Community name cannot be empty." },
      );
    }

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
    const page = await listCommunityMembers(client, communityName, { cursor, limit });

    return NextResponse.json(
      { ok: true, members: page.members, nextCursor: page.nextCursor },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
