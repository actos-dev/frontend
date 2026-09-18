import type { Actor } from "actos";
import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/** GET /api/register/actors — a small set of real accounts for optional onboarding follows. */
export async function GET() {
  try {
    const client = await getServerClient();
    const page = await client.actors.list({ sort: "new", limit: 5 });
    return NextResponse.json(
      { ok: true, items: page.items as Actor[] },
      { headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
