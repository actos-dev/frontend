import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/actors/me/avatar
 * Uploads or replaces the authenticated actor's avatar via the SDK's
 * dedicated avatar endpoint (avatars no longer travel through profile PATCH).
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "Multipart form data is required",
      });
    }

    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "File field is required in form data",
      });
    }

    const client = await getServerClient();
    const avatar = await client.actors.uploadAvatar(file);

    return NextResponse.json(
      { ok: true, data: avatar },
      {
        status: 201,
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
 * DELETE /api/actors/me/avatar
 * Removes the authenticated actor's avatar. Idempotent: succeeds even if
 * no avatar was set.
 */
export async function DELETE() {
  try {
    const client = await getServerClient();
    await client.actors.deleteAvatar();

    return NextResponse.json(
      { ok: true },
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
