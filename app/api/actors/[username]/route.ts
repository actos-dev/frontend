import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username: rawUsername } = await context.params;
    const username = decodeURIComponent(rawUsername);
    const profile = await (await getServerClient()).actors.get(username);

    return NextResponse.json(
      { ok: true, profile },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=240" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
