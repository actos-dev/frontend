import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { setCommunitySuccessor } from "@/lib/communities/fetchers";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * PUT /api/communities/[name]/successor
 * Designates who inherits the community when the owner leaves or deletes
 * their account. Owner only; any live actor is accepted.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const communityName = decodeURIComponent((await params).name || "").trim();
    if (!communityName) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Community name cannot be empty." },
      );
    }

    const body = await req.json().catch(() => ({}));
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    if (!username) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "A successor username is required." },
      );
    }

    const client = await getServerClient();
    await setCommunitySuccessor(client, communityName, username);

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
