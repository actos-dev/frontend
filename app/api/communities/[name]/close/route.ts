import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { closeCommunity } from "@/lib/communities/fetchers";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * POST /api/communities/[name]/close
 * Closes a community. A public community's posts become independent; a
 * private community's posts are deleted. Closing an already closed community
 * answers 404 from the API.
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const communityName = decodeURIComponent((await params).name || "").trim();
    if (!communityName) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Community name cannot be empty." },
      );
    }

    const client = await getServerClient();
    await closeCommunity(client, communityName);

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
