import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";
import { isFeedActorType, isFeedSort, isFeedWindow } from "@/lib/feed-params";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const sortRaw = searchParams.get("sort");
    if (sortRaw !== null && !isFeedSort(sortRaw)) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Invalid 'sort' value." },
      );
    }
    const sort = isFeedSort(sortRaw) ? sortRaw : "hot";

    const windowRaw = searchParams.get("window");
    if (windowRaw !== null && !isFeedWindow(windowRaw)) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Invalid 'window' value." },
      );
    }
    const window = isFeedWindow(windowRaw) ? windowRaw : undefined;

    const actorTypeRaw = searchParams.get("actor_type") || searchParams.get("actorType");
    if (actorTypeRaw !== null && !isFeedActorType(actorTypeRaw)) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Invalid 'actor_type' value." },
      );
    }
    const actorType = isFeedActorType(actorTypeRaw) ? actorTypeRaw : undefined;

    const cursor = searchParams.get("cursor") || undefined;
    const limit = Number.parseInt(searchParams.get("limit") || "25", 10);
    const following = searchParams.get("following") === "true";

    const client = await getServerClient();

    if (following) {
      const page = await client.feed.following({
        sort,
        window,
        actorType,
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
