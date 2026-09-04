import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/settings/keys/[id]
 * Revokes an API key by its UUID.
 */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    if (!id) {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "Key ID is required",
      });
    }

    const client = await getServerClient();
    await client.auth.revokeKey(id);

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
