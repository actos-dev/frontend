import type {
  Actos,
  AdminAction,
  CreateBanInput,
  ListAdminReportsParams,
  ModerateDeleteInput,
  Page,
  PaginationParams,
  Report,
  UpdateReportInput,
} from "actos";
import { GLOBAL_ADMIN_PERMISSIONS, GLOBAL_MODERATOR_PERMISSIONS } from "@/lib/mod/capabilities";

/**
 * Lists reports with status filter and pagination.
 */
export async function listReports(
  client: Actos,
  params?: ListAdminReportsParams,
): Promise<Page<Report>> {
  return client.admin.reports.list(params);
}

/**
 * Updates report status (resolve or dismiss) with mandatory/optional notes.
 */
export async function updateReport(
  client: Actos,
  id: string,
  input: UpdateReportInput,
): Promise<Report> {
  return client.admin.reports.update(id, input);
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

  const input: ModerateDeleteInput = { reason };
  await client.admin.contents.delete(contentId, input);
}

/**
 * Creates a permanent or temporary ban for an actor account.
 */
export async function banActor(client: Actos, input: CreateBanInput) {
  if (!input.username?.trim()) {
    throw new Error("Kullanıcı adı zorunludur.");
  }
  if (!input.reason?.trim()) {
    throw new Error("Ban gerekçesi zorunludur.");
  }

  return client.admin.bans.create(input);
}

/**
 * Lifts/removes a ban from an actor account.
 */
export async function unbanActor(client: Actos, username: string): Promise<void> {
  if (!username?.trim()) {
    throw new Error("Kullanıcı adı zorunludur.");
  }

  await client.admin.bans.remove(username);
}

/**
 * Lists audit trail logs.
 */
export async function listAuditLogs(
  client: Actos,
  params?: PaginationParams,
): Promise<Page<AdminAction>> {
  return client.admin.actions.list(params);
}

export interface SetRoleInput {
  username: string;
  role: "moderator" | "admin" | null;
}

/**
 * Assigns or revokes the global permission bundle behind the legacy
 * admin/moderator role form, using the 0.3.0 scoped-permission endpoints.
 * `admin.permissions.grant`/`revoke` are idempotent, one call per permission.
 */
export async function setRole(client: Actos, input: SetRoleInput): Promise<void> {
  if (!input.username?.trim()) {
    throw new Error("Kullanıcı adı zorunludur.");
  }

  const permissions =
    input.role === "moderator" ? GLOBAL_MODERATOR_PERMISSIONS : GLOBAL_ADMIN_PERMISSIONS;

  for (const permission of permissions) {
    if (input.role === null) {
      await client.admin.permissions.revoke({ username: input.username, permission });
    } else {
      await client.admin.permissions.grant({ username: input.username, permission });
    }
  }
}
