import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const contentId = body?.contentId;
    const action = body?.action === "remove" ? "remove" : "add";

    if (!contentId || typeof contentId !== "string") {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "contentId is required and must be a string",
      });
    }

    const client = await getServerClient();
    if (action === "remove") {
      await client.saves.remove(contentId);
    } else {
      await client.saves.add(contentId);
    }

    return NextResponse.json(
      { ok: true, saved: action === "add", contentId },
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

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const contentId = body?.contentId || req.nextUrl.searchParams.get("contentId");

    if (!contentId || typeof contentId !== "string") {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "contentId is required and must be a string",
      });
    }

    const client = await getServerClient();
    await client.saves.remove(contentId);

    return NextResponse.json(
      { ok: true, saved: false, contentId },
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
