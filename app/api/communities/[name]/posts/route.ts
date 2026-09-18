import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { listCommunityPosts } from "@/lib/communities/fetchers";
import { isCommunityPostSort, parseCommunityLimit } from "@/lib/communities/params";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * GET /api/communities/[name]/posts
 * A community's posts with the same list shape as `/api/feed`, sorted by
 * `new` (default), `top` or `hot`. This is the real 0.3.0 path — there is no
 * `/communities/{name}/feed` (ROADMAP §7.3 item 5 is aspirational).
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
    const sortRaw = searchParams.get("sort");
    if (sortRaw !== null && !isCommunityPostSort(sortRaw)) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Invalid 'sort' value." },
      );
    }
    const sort = isCommunityPostSort(sortRaw) ? sortRaw : "new";

    const limit = parseCommunityLimit(searchParams.get("limit"));
    if (limit === null) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Invalid 'limit' value." },
      );
    }

    const cursor = searchParams.get("cursor") || undefined;
    const client = await getServerClient();
    const page = await listCommunityPosts(client, communityName, { sort, cursor, limit });

    return NextResponse.json(
      { ok: true, items: page.items, nextCursor: page.nextCursor },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
