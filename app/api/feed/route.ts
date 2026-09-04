import type { ActorType, FeedWindow, Post, PostSort } from "actos";
import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";
import { MOCK_FEED_POSTS } from "@/lib/feed-mock";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const sort = (searchParams.get("sort") as PostSort) || "hot";
    const window = (searchParams.get("window") as FeedWindow) || undefined;
    const actorType = (searchParams.get("actor_type") || searchParams.get("actorType")) as
      | ActorType
      | undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Number.parseInt(searchParams.get("limit") || "25", 10);
    const following = searchParams.get("following") === "true";

    const client = await getServerClient();

    try {
      if (following) {
        const page = await client.feed.following({
          sort,
          window,
          actorType,
          cursor,
          limit,
          fields: ["bodyHtml" as keyof Post],
        });

        return NextResponse.json(
          {
            ok: true,
            items: page.items,
            nextCursor: page.nextCursor,
          },
          {
            headers: {
              "Cache-Control": "private, no-cache, no-store, must-revalidate",
            },
          },
        );
      }

      const page = await client.feed.list({
        sort,
        window,
        actorType,
        cursor,
        limit,
        fields: ["bodyHtml" as keyof Post],
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
    } catch (clientErr) {
      console.warn("Actos API /feed fetch failed, using fallback:", clientErr);

      // Local mock fallback for development / offline environments
      let filtered = [...MOCK_FEED_POSTS];
      if (actorType) {
        filtered = filtered.filter((p) => p.author.actorType === actorType);
      }

      return NextResponse.json({
        ok: true,
        items: cursor ? [] : filtered,
        nextCursor: null,
      });
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
