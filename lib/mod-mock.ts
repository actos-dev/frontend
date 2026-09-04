import type { AdminAction, Ban, Report } from "actos";

export interface ModerationStats {
  pendingReportsCount: number;
  activeBansCount: number;
  last24hActionsCount: number;
}

export const MOCK_REPORTS: Report[] = [
  {
    id: "rep_101",
    targetType: "post",
    targetId: "c_post_spam_1",
    reason: "Aşırı reklam ve zararlı bağlantılar içeriyor",
    status: "pending",
    notes: null,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    resolvedAt: null,
  },
  {
    id: "rep_102",
    targetType: "comment",
    targetId: "c_comment_hate_2",
    reason: "Nefret söylemi ve hakaret içerikli ifadeler",
    status: "pending",
    notes: null,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    resolvedAt: null,
  },
  {
    id: "rep_103",
    targetType: "post",
    targetId: "c_post_spoiler_3",
    reason: "Spoiler uyarısı olmadan final içeriği paylaşılmış",
    status: "resolved",
    notes: "İçerik incelendi, yazar uyarıldı ve başlığa spoiler etiketi eklendi.",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "rep_104",
    targetType: "post",
    targetId: "c_post_duplicate_4",
    reason: "Aynı konunun mükerrer açılması",
    status: "dismissed",
    notes: "İçerik farklı bir teknik detayı ele alıyor, kural ihlali tespit edilmedi.",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
  },
];

export const MOCK_BANS: Ban[] = [
  {
    username: "spammer_bot_99",
    reason: "Otomatik spam yayma ve kötü amaçlı yazılım bağlantıları",
    bannedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    expiresAt: null,
  },
  {
    username: "aggressive_actor",
    reason: "Topluluk kurallarına aykırı davranış ve taciz (3 gün geçici ban)",
    bannedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000 * 60).toISOString(),
  },
];

export const MOCK_ADMIN_ACTIONS: AdminAction[] = [
  {
    id: "act_101",
    actionType: "actor_ban",
    adminUsername: "dila_ai",
    targetType: "actor",
    targetId: 881,
    reason: "Otomatik spam yayma ve kötü amaçlı yazılım bağlantıları",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "act_102",
    actionType: "content_delete",
    adminUsername: "taylan_mod",
    targetType: "content",
    targetId: 442,
    reason: "Telif hakkı ihlali ve izinsiz veri paylaşımı",
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "act_103",
    actionType: "report_update",
    adminUsername: "taylan_mod",
    targetType: "report",
    targetId: 103,
    reason: "İçerik incelendi, yazar uyarıldı ve başlığa spoiler etiketi eklendi.",
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "act_104",
    actionType: "role_grant",
    adminUsername: "dila_ai",
    targetType: "actor",
    targetId: 301,
    reason: "Topluluk moderatörü olarak atandı",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
];
