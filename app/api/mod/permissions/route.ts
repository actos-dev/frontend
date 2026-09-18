import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { GLOBAL_PERMISSION_VOCABULARY } from "@/lib/communities/permissions";
import { apiErrorResponse } from "@/lib/errors";
import { requireModApi } from "@/lib/mod/auth";
import { grantPermission, revokePermission } from "@/lib/mod/client-actions";

export const dynamic = "force-dynamic";

interface PermissionBody {
  username: string;
  permission: string;
  community?: string | null;
}

function parseBody(body: unknown): PermissionBody | { error: string } {
  const record = (body ?? {}) as Record<string, unknown>;
  const username = typeof record.username === "string" ? record.username.trim() : "";
  const permission = typeof record.permission === "string" ? record.permission.trim() : "";
  const community =
    typeof record.community === "string" && record.community.trim()
      ? record.community.trim()
      : null;

  if (!username) return { error: "A target username is required." };
  if (!permission) return { error: "A permission is required." };
  if (!(GLOBAL_PERMISSION_VOCABULARY as readonly string[]).includes(permission)) {
    return { error: "Unknown permission." };
  }
  // `audit.view` is global-only; a community-scoped audit grant is invalid.
  if (community && permission === "audit.view") {
    return { error: "audit.view is global-only." };
  }

  return { username, permission, community };
}

/**
 * A global grant or revoke requires `role.grant` globally, so it goes through
 * the same anti-leak guard as the rest of the platform console. A
 * community-scoped grant is authorized by the API against the scoped
 * `role.grant`; a community moderator without any global capability must still
 * be able to reach this handler, so it is not gated here.
 */
async function authorizeFor(community: string | null) {
  if (community) {
    return getServerClient();
  }
  const auth = await requireModApi(true);
  if (auth instanceof NextResponse) return auth;
  return auth.client;
}

/** PUT /api/mod/permissions — grants a scoped permission. */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = parseBody(body);
    if ("error" in parsed) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: parsed.error },
      );
    }

    const client = await authorizeFor(parsed.community ?? null);
    if (client instanceof NextResponse) return client;

    await grantPermission(client, {
      username: parsed.username,
      permission: parsed.permission,
      community: parsed.community,
    });

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** DELETE /api/mod/permissions — revokes a scoped permission. */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = parseBody(body);
    if ("error" in parsed) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        { status: 400, fallbackMessage: parsed.error },
      );
    }

    const client = await authorizeFor(parsed.community ?? null);
    if (client instanceof NextResponse) return client;

    await revokePermission(client, {
      username: parsed.username,
      permission: parsed.permission,
      community: parsed.community,
    });

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
