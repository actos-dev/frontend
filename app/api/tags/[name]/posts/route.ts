import type { PostSort } from "actos";
import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";
import { MOCK_FEED_POSTS } from "@/lib/feed-mock";

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
      return NextResponse.json(
        { ok: false, title: "Etiket adı geçersiz", detail: "Etiket adı boş olamaz" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const sort = (searchParams.get("sort") as PostSort) || "hot";
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Number.parseInt(searchParams.get("limit") || "25", 10);

    const client = await getServerClient();

    try {
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
    } catch (_clientErr) {
      // Offline fallback: filter mock posts by tag
      const matched = MOCK_FEED_POSTS.filter((p) =>
        p.tags?.some((t) => t.toLowerCase() === tagName),
      );

      return NextResponse.json({
        ok: true,
        items: cursor ? [] : matched,
        nextCursor: null,
      });
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
