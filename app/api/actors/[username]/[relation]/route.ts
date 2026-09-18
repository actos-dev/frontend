import type { Actor } from "actos";
import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string; relation: string }> },
) {
  try {
    const { username: rawUsername, relation } = await context.params;
    if (relation !== "followers" && relation !== "following") {
      return NextResponse.json({ ok: false, detail: "Unknown actor relation" }, { status: 404 });
    }

    const username = decodeURIComponent(rawUsername);
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
    const client = await getServerClient();
    const page =
      relation === "followers"
        ? await client.actors.followers(username, { cursor, limit })
        : await client.actors.following(username, { cursor, limit });

    return NextResponse.json(
      { ok: true, items: page.items as Actor[], nextCursor: page.nextCursor ?? null },
      { headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
