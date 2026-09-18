import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { applyToCommunity, listCommunityApplications } from "@/lib/communities/fetchers";
import { isApplicationStatus, parseCommunityLimit } from "@/lib/communities/params";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ name: string }>;
}

function resolveName(name: string | undefined): string {
  return decodeURIComponent(name || "").trim();
}

/**
 * GET /api/communities/[name]/applications
 * The moderation queue for a private community, filterable by status.
 * Requires `member.approve` scoped to the community (the API enforces it).
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const communityName = resolveName((await params).name);
    if (!communityName) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Community name cannot be empty." },
      );
    }

    const { searchParams } = req.nextUrl;
    const limit = parseCommunityLimit(searchParams.get("limit"));
    if (limit === null) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Invalid 'limit' value." },
      );
    }

    const rawStatus = searchParams.get("status");
    if (rawStatus !== null && !isApplicationStatus(rawStatus)) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Invalid 'status' value." },
      );
    }

    const cursor = searchParams.get("cursor") || undefined;
    const client = await getServerClient();
    const page = await listCommunityApplications(client, communityName, {
      status: rawStatus ?? undefined,
      cursor,
      limit,
    });

    return NextResponse.json(
      { ok: true, applications: page.applications, nextCursor: page.nextCursor },
      { headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/communities/[name]/applications
 * Applies to a private community. The reason is 1-2000 characters; a second
 * pending application answers 409 and a banned applicant answers 403.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const communityName = resolveName((await params).name);
    if (!communityName) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Community name cannot be empty." },
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (!reason) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "A reason is required." },
      );
    }
    if (reason.length > 2000) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "A reason can be at most 2,000 characters." },
      );
    }

    const client = await getServerClient();
    await applyToCommunity(client, communityName, reason);

    return new NextResponse(null, {
      status: 201,
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
