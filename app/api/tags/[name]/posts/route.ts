import type { PostSort } from "actos";
import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * GET /api/tags/[name]/posts
 * Returns posts tagged with [name] using keyset cursor pagination.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const tagName = decodeURIComponent(resolvedParams.name || "")
      .trim()
      .toLowerCase();

    if (!tagName) {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "Tag name cannot be empty",
      });
    }

    const { searchParams } = new URL(req.url);
    const sort = (searchParams.get("sort") as PostSort) || "hot";
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Number.parseInt(searchParams.get("limit") || "25", 10);

    const client = await getServerClient();
    const page = await client.tags.posts(tagName, {
      sort,
      cursor,
      limit,
    });

    return NextResponse.json(
      {
        ok: true,
        items: page.items,
        nextCursor: page.nextCursor,
      },
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
