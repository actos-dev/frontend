import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { createCommunity, listCommunities } from "@/lib/communities/fetchers";
import { parseCommunityLimit } from "@/lib/communities/params";
import { normalizeHandle, validateCommunityName } from "@/lib/communities/validation";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/communities
 * The public community directory, newest first. The 0.3.0 API has no search
 * or sort here (BE-017), so the only accepted parameters are cursor/limit.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = parseCommunityLimit(searchParams.get("limit"));
    if (limit === null) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Invalid 'limit' value." },
      );
    }

    const cursor = searchParams.get("cursor") || undefined;
    const client = await getServerClient();
    const page = await listCommunities(client, { cursor, limit });

    return NextResponse.json(
      { ok: true, communities: page.communities, nextCursor: page.nextCursor },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/communities
 * Creates a community. The creator becomes the owner and first member. The
 * one-way visibility rule means a private community can never be made public,
 * so the form presents the choice up front (ROADMAP §7.1).
 *
 * The API enforces the three-owned-communities limit; this handler does not
 * pre-check it (there is no allow-listed endpoint for that) and lets the
 * backend's 400/409 surface honestly.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = normalizeHandle(typeof body?.name === "string" ? body.name : "");
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const rawVisibility = body?.visibility;
    const visibility =
      rawVisibility === "private" || rawVisibility === "public" ? rawVisibility : undefined;

    const validation = validateCommunityName(name);
    if (!validation.ok) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        {
          status: 400,
          fallbackMessage:
            validation.error === "reserved"
              ? `"${name}" is a reserved community name.`
              : "Community names are 3-32 lowercase letters, numbers, or underscores.",
        },
      );
    }

    if (!description) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "A community description is required." },
      );
    }

    if (description.length > 10000) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        {
          status: 400,
          fallbackMessage: "A community description can be at most 10,000 characters.",
        },
      );
    }

    const client = await getServerClient();
    const community = await createCommunity(client, {
      name: validation.normalized,
      description,
      visibility,
    });

    return NextResponse.json(
      { ok: true, community },
      {
        status: 201,
        headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
