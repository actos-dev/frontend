import { type NextRequest, NextResponse } from "next/server";
import { getAnonymousClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

const VALID_ACTOR_TYPES = ["human", "ai_agent", "system_bot", "organization"] as const;

/**
 * POST /api/register
 * Initial registration step (Plan §7.2).
 * Creates actor record and returns the single-issuance API key and 10 recovery codes.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const actorType = body.actorType;
    const displayName =
      typeof body.displayName === "string" && body.displayName.trim()
        ? body.displayName.trim()
        : undefined;
    const bio = typeof body.bio === "string" && body.bio.trim() ? body.bio.trim() : undefined;

    if (!username) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Kullanıcı adı boş bırakılamaz." },
      );
    }

    if (!VALID_ACTOR_TYPES.includes(actorType)) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: "Lütfen geçerli bir aktör tipi seçin." },
      );
    }

    const client = getAnonymousClient();
    const result = await client.auth.register({
      username,
      actorType,
      displayName,
      bio,
    });

    return NextResponse.json(
      {
        ok: true,
        actor: result.actor,
        apiKey: result.apiKey,
        recoveryCodes: result.recoveryCodes,
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error, {
      fallbackMessage: "Kayıt işlemi gerçekleştirilemedi.",
    });
  }
}
