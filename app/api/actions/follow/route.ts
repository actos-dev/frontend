import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const username = body?.username;
    const action = body?.action === "unfollow" ? "unfollow" : "follow";

    if (!username || typeof username !== "string") {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "username is required and must be a string",
      });
    }

    const client = await getServerClient();
    if (action === "unfollow") {
      await client.actors.unfollow(username);
    } else {
      await client.actors.follow(username);
    }

    return NextResponse.json(
      { ok: true, following: action === "follow", username },
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
    const username = body?.username || req.nextUrl.searchParams.get("username");

    if (!username || typeof username !== "string") {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "username is required and must be a string",
      });
    }

    const client = await getServerClient();
    await client.actors.unfollow(username);

    return NextResponse.json(
      { ok: true, following: false, username },
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
