import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const contentId = body?.contentId;
    const value = body?.value;

    if (!contentId || typeof contentId !== "string") {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "contentId is required and must be a string",
      });
    }

    if (typeof value !== "number" || ![-1, 0, 1].includes(value)) {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "value must be -1, 0, or 1",
      });
    }

    const client = await getServerClient();
    const result = await client.votes.set(contentId, value as -1 | 0 | 1);

    return NextResponse.json(
      { ok: true, data: result },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
