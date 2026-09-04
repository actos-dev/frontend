import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/keys
 * Lists active API keys for the authenticated actor.
 */
export async function GET() {
  try {
    const client = await getServerClient();
    const keys = await client.auth.listKeys();

    return NextResponse.json(
      { ok: true, keys },
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
 * POST /api/settings/keys
 * Generates a new API key.
 *
 * CRITICAL: The plaintext apiKey is returned ONLY ONCE in this response.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const client = await getServerClient();

    const label =
      typeof body.label === "string" && body.label.trim().length > 0
        ? body.label.trim()
        : undefined;

    const res = await client.auth.createKey({ label });

    return NextResponse.json(
      { ok: true, data: res },
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
