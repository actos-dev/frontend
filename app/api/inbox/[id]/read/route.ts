import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/inbox/[id]/read
 * Marks a single notification as read (idempotent).
 * Returns 204 No Content.
 */
export async function PATCH(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;

    if (!id) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Bildirim ID gereklidir." },
      );
    }

    const client = await getServerClient();
    await client.inbox.read(id);

    return new NextResponse(null, {
      status: 204,
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
