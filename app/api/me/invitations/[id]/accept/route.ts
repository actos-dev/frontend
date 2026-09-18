import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { acceptMyInvitation } from "@/lib/communities/fetchers";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** POST /api/me/invitations/[id]/accept — accepts an invitation, joining its community. */
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
    await acceptMyInvitation(client, id);

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
