import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { acceptCommunityApplication } from "@/lib/communities/fetchers";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ name: string; id: string }>;
}

/**
 * POST /api/communities/[name]/applications/[id]/accept
 * Accepts a pending application, making the applicant a member.
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const resolved = await params;
    const communityName = decodeURIComponent(resolved.name || "").trim();
    const applicationId = decodeURIComponent(resolved.id || "").trim();
    if (!communityName || !applicationId) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Community name and application id are required." },
      );
    }

    const client = await getServerClient();
    await acceptCommunityApplication(client, communityName, applicationId);

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
