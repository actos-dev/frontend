import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { getCommunity } from "@/lib/communities/fetchers";
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
