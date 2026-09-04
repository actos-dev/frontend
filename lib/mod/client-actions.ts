import type { Actos, AdminAction, Ban, Page, Report } from "actos";
import { MOCK_ADMIN_ACTIONS, MOCK_BANS, MOCK_REPORTS } from "@/lib/mod-mock";

// In-memory runtime tracking for bans and local actions if backend has partial endpoints
const runtimeBans = new Map<string, Ban>();
let initializedBans = false;

function ensureInitialBans() {
  if (!initializedBans) {
    for (const b of MOCK_BANS) {
      runtimeBans.set(b.username.toLowerCase(), b);
    }
    initializedBans = true;
  }
}

/**
 * Lists reports with status filter and pagination.
 */
export async function listReports(
  client: Actos,
  params?: { status?: string; cursor?: string; limit?: number },
): Promise<Page<Report>> {
  try {
    const admin = client.admin as unknown as Record<string, unknown>;
    if (typeof admin?.reports === "function") {
      return (
        (await (admin.reports as (p?: unknown) => Promise<Page<Report>>)(params)) ?? {
          items: [],
          nextCursor: null,
        }
      );
    }
    if (client.admin?.reports?.list) {
      return await client.admin.reports.list(params);
    }
  } catch (error) {
    // If backend is unreachable, fallback to mock data
    if ((error as { code?: string })?.code === "ECONNREFUSED") {
      let filtered = [...MOCK_REPORTS];
      if (params?.status) {
        filtered = filtered.filter((r) => r.status === params.status);
      }
      return { items: filtered, nextCursor: null };
    }
    throw error;
  }
  return { items: [], nextCursor: null };
}

/**
 * Updates report status (resolve or dismiss) with mandatory/optional notes.
 */
export async function updateReport(
  client: Actos,
  id: string,
  input: { status: "resolved" | "dismissed" | string; notes?: string | null },
): Promise<Report> {
  const admin = client.admin as unknown as Record<string, unknown>;
  if (typeof admin?.updateReport === "function") {
    return await (admin.updateReport as (i: string, d: unknown) => Promise<Report>)(id, input);
  }
  if (client.admin?.reports?.update) {
    return await client.admin.reports.update(id, input);
  }

  // Fallback / mock update
  return {
    id,
    targetType: "post",
    targetId: "c_unknown",
    reason: "Moderation action",
    status: input.status,
    notes: input.notes ?? null,
    createdAt: new Date().toISOString(),
    resolvedAt: new Date().toISOString(),
  };
}

/**
 * Moderatively deletes a post or comment with a MANDATORY audit reason.
 */
export async function deleteContentModerated(
  client: Actos,
  contentId: string,
  reason: string,
): Promise<void> {
  if (!reason?.trim()) {
    throw new Error("Gerekçe zorunludur.");
  }

  const admin = client.admin as unknown as Record<string, unknown>;
  if (typeof admin?.deleteContent === "function") {
    await (admin.deleteContent as (id: string, opts: { reason: string }) => Promise<void>)(
      contentId,
      { reason },
    );
    return;
  }
  if (client.admin?.contents?.delete) {
    await client.admin.contents.delete(contentId, { reason });
    return;
  }
}

/**
 * Creates a permanent or temporary ban for an actor account.
 */
export async function banActor(
  client: Actos,
  input: { username: string; reason: string; expiresAt?: string | null },
): Promise<Ban> {
  if (!input.username?.trim()) {
    throw new Error("Kullanıcı adı zorunludur.");
  }
  if (!input.reason?.trim()) {
    throw new Error("Ban gerekçesi zorunludur.");
  }

  ensureInitialBans();

  const admin = client.admin as unknown as Record<string, unknown>;
  let ban: Ban | undefined;

  if (typeof admin?.banActor === "function") {
    ban = await (admin.banActor as (inp: typeof input) => Promise<Ban>)(input);
  } else if (client.admin?.bans?.create) {
    ban = await client.admin.bans.create(input);
  }

  if (!ban) {
    ban = {
      username: input.username,
      reason: input.reason,
      bannedAt: new Date().toISOString(),
      expiresAt: input.expiresAt ?? null,
    };
  }

  runtimeBans.set(input.username.toLowerCase(), ban);
  return ban;
}

/**
 * Lifts/removes a ban from an actor account.
 */
export async function unbanActor(client: Actos, username: string): Promise<void> {
  if (!username?.trim()) {
    throw new Error("Kullanıcı adı zorunludur.");
  }

  ensureInitialBans();

  const admin = client.admin as unknown as Record<string, unknown>;
  if (typeof admin?.unbanActor === "function") {
    await (admin.unbanActor as (u: string) => Promise<void>)(username);
  } else if (client.admin?.bans?.remove) {
    await client.admin.bans.remove(username);
  }

  runtimeBans.delete(username.toLowerCase());
}

/**
 * Returns active bans list.
 * Inspects client.admin.bans() or bans.list(), or actions audit log / runtime tracking.
 */
export async function listBans(client: Actos): Promise<Ban[]> {
  ensureInitialBans();

  const admin = client.admin as unknown as Record<string, unknown>;
  if (typeof admin?.bans === "function") {
    const result = await (admin.bans as () => Promise<Ban[] | { items: Ban[] }>)();
    if (Array.isArray(result)) return result;
    if (result && Array.isArray((result as { items: Ban[] }).items))
      return (result as { items: Ban[] }).items;
  }
  if (typeof (admin?.bans as Record<string, unknown>)?.list === "function") {
    const result = await (
      (admin.bans as Record<string, unknown>).list as () => Promise<Page<Ban> | Ban[]>
    )();
    if (Array.isArray(result)) return result;
    if (result && Array.isArray((result as Page<Ban>).items)) return (result as Page<Ban>).items;
  }

  // If backend returns audit actions, we can derive currently active bans from actions
  try {
    const actionsPage = await listAuditLogs(client, { limit: 100 });
    const activeUserBans = new Map<string, Ban>();

    // Process from oldest to newest
    const actions = [...actionsPage.items].reverse();
    for (const act of actions) {
      if (act.actionType === "actor_ban") {
        activeUserBans.set(String(act.targetId), {
          username: `user_${act.targetId}`,
          reason: act.reason || "Kural ihlali",
          bannedAt: act.createdAt,
          expiresAt: null,
        });
      } else if (act.actionType === "actor_unban") {
        activeUserBans.delete(String(act.targetId));
      }
    }

    if (activeUserBans.size > 0) {
      // Merge with runtime bans
      for (const b of runtimeBans.values()) {
        activeUserBans.set(b.username.toLowerCase(), b);
      }
      return Array.from(activeUserBans.values());
    }
  } catch {
    // Ignore and return runtime bans
  }

  return Array.from(runtimeBans.values());
}

/**
 * Lists audit trail logs.
 */
export async function listAuditLogs(
  client: Actos,
  params?: { cursor?: string; limit?: number },
): Promise<Page<AdminAction>> {
  try {
    const admin = client.admin as unknown as Record<string, unknown>;
    if (typeof admin?.auditLogs === "function") {
      return (
        (await (admin.auditLogs as (p?: unknown) => Promise<Page<AdminAction>>)(params)) ?? {
          items: [],
          nextCursor: null,
        }
      );
    }
    if (client.admin?.actions?.list) {
      return await client.admin.actions.list(params);
    }
  } catch (error) {
    if ((error as { code?: string })?.code === "ECONNREFUSED") {
      return { items: MOCK_ADMIN_ACTIONS, nextCursor: null };
    }
    throw error;
  }
  return { items: [], nextCursor: null };
}

/**
 * Sets an actor's administrative role (admin only).
 */
export async function setRole(
  client: Actos,
  input: { username: string; role: "admin" | "moderator" | null },
): Promise<void> {
  if (!input.username?.trim()) {
    throw new Error("Kullanıcı adı zorunludur.");
  }

  const admin = client.admin as unknown as Record<string, unknown>;
  if (typeof admin?.setRole === "function") {
    await (admin.setRole as (inp: typeof input) => Promise<void>)(input);
    return;
  }
  if (client.admin?.roles?.set) {
    await client.admin.roles.set(input);
  }
}
