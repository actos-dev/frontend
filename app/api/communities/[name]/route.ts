import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { getCommunity, updateCommunity } from "@/lib/communities/fetchers";
import { isCommunityVisibility } from "@/lib/communities/params";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * GET /api/communities/[name]
 * Resolves a single community for the composer's `Post to` field. The same
 * cover-vs-full rules as the page apply: a private community the viewer cannot
 * see inside comes back as a cover (`isMember: false`, zeroed counts). There
 * are no viewer capabilities in 0.3.0 (BE-018) — membership is the only signal.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const communityName = decodeURIComponent(name || "").trim();
    if (!communityName) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Community name cannot be empty." },
      );
    }

    const client = await getServerClient();
    const community = await getCommunity(client, communityName);

    return NextResponse.json(
      { ok: true, community },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * PATCH /api/communities/[name]
 * Edits the description and/or flips visibility. The move is one-way
 * (public to private only); a private-to-public request is passed through so
 * the API's 400 is what the user sees, never an invented success. A
 * visibility-only patch omits `description` entirely (the backend treats an
 * absent field as "leave it unchanged").
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const communityName = decodeURIComponent(name || "").trim();
    if (!communityName) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Community name cannot be empty." },
      );
    }

    const body = await req.json().catch(() => ({}));
    const input: { description?: string; visibility?: "public" | "private" } = {};

    if (typeof body?.description === "string") {
      input.description = body.description.trim();
    }

    if (body?.visibility !== undefined) {
      if (!isCommunityVisibility(body.visibility)) {
        return apiErrorResponse(
          { code: "VALIDATION_FAILED", status: 400 },
          { status: 400, fallbackMessage: "Visibility must be 'public' or 'private'." },
        );
      }
      input.visibility = body.visibility;
    }

    if (input.description === undefined && input.visibility === undefined) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Nothing to update." },
      );
    }

    const client = await getServerClient();
    const community = await updateCommunity(client, communityName, input);

    return NextResponse.json(
      { ok: true, community },
      { headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
