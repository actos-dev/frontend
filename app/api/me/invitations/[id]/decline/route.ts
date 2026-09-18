import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { declineMyInvitation } from "@/lib/communities/fetchers";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** POST /api/me/invitations/[id]/decline — declines an invitation. */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const id = decodeURIComponent((await params).id || "").trim();
    if (!id) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Invitation id is required." },
      );
    }

    const client = await getServerClient();
    await declineMyInvitation(client, id);

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
