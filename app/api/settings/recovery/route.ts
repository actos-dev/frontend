import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/settings/recovery
 * Invalidate all existing recovery codes and generate 10 fresh ones.
 *
 * CRITICAL: The new codes are returned ONLY ONCE in this response.
 */
export async function POST() {
  try {
    const client = await getServerClient();
    const res = await client.auth.regenerateRecoveryCodes();

    return NextResponse.json(
      { ok: true, data: res },
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
