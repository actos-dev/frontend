import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ name: string }>;
}

function resolveName(name: string | undefined): string {
  return decodeURIComponent(name || "").trim();
}

/**
 * POST /api/communities/[name]/join
 * Joins a public community. Instant and idempotent on the backend; the real
 * 0.3.0 path is `/join`, not `/membership` (ROADMAP §7.3 item 3 is stale).
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const communityName = resolveName((await params).name);
    if (!communityName) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Community name cannot be empty." },
      );
    }

    const client = await getServerClient();
    await client.communities.join(communityName);

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/communities/[name]/join
 * Leaves a community. Idempotent on the backend.
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const communityName = resolveName((await params).name);
    if (!communityName) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Community name cannot be empty." },
      );
    }

    const client = await getServerClient();
    await client.communities.leave(communityName);

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
