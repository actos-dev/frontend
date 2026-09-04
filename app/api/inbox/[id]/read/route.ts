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

    try {
      await client.inbox.read(id);
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      });
    } catch (clientErr) {
      if (
        clientErr &&
        typeof clientErr === "object" &&
        ("status" in clientErr || "code" in clientErr)
      ) {
        const err = clientErr as { status?: number; code?: string };
        if (
          err.status === 401 ||
          err.code === "MISSING_CREDENTIALS" ||
          err.code === "INVALID_KEY"
        ) {
          return apiErrorResponse(clientErr, { status: 401 });
        }
        if (err.status === 404 || err.code === "NOT_FOUND") {
          return apiErrorResponse(clientErr, { status: 404 });
        }
      }

      // Offline fallback: idempotent success
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      });
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
