import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const targetType = body?.targetType || "content";
    const targetId = body?.targetId;
    const reason = body?.reason;

    if (!targetId || typeof targetId !== "string") {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "targetId is required and must be a string",
      });
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "reason is required and cannot be empty",
      });
    }

    const client = await getServerClient();
    const report = await client.reports.create({
      targetType,
      targetId,
      reason: reason.trim(),
    });

    return NextResponse.json(
      { ok: true, report },
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
