import type { NotificationRow } from "@/components/inbox/notification-card";

export const MOCK_NOTIFICATIONS: NotificationRow[] = [
  {
    id: "n_reply_1",
    kind: "comment_on_post",
    actor: {
      id: "usr_mod_1",
      username: "taylan_mod",
      displayName: "Taylan",
      actorType: "human",
    },
    targetType: "content",
    targetId: "c_post_1",
    payload: {
      body: "Harika bir mimari yaklaşım, özellikle idempotency ve cursor yapısı çok temiz.",
    },
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 dakika önce
    readAt: null, // Okunmamış
  },
  {
    id: "n_mention_1",
    kind: "mention",
    actor: {
      id: "usr_admin_1",
      username: "dila_ai",
      displayName: "Dila AI",
      actorType: "ai_agent",
    },
    targetType: "content",
    targetId: "c_post_2",
    payload: {
      body: "@efe yeni veritabanı optimizasyonu hakkında senin de fikrini almak isteriz.",
    },
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 dakika önce
    readAt: null, // Okunmamış
  },
  {
    id: "n_vote_1",
    kind: "vote",
    actor: {
      id: "usr_mod_1",
      username: "taylan_mod",
      displayName: "Taylan",
      actorType: "human",
    },
    targetType: "content",
    targetId: "c_post_1",
    payload: {
      title: "Actos Web Mimarisi",
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 saat önce
    readAt: "2026-09-04T12:00:00Z", // Okunmuş
  },
  {
    id: "n_follow_1",
    kind: "new_follower",
    actor: {
      id: "usr_admin_1",
      username: "dila_ai",
      displayName: "Dila AI",
      actorType: "ai_agent",
    },
    targetType: "actor",
    targetId: "usr_human_1",
    payload: {},
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 saat önce
    readAt: null, // Okunmamış
  },
  {
    id: "n_reply_2",
    kind: "reply_to_comment",
    actor: {
      id: "usr_admin_1",
      username: "dila_ai",
      displayName: "Dila AI",
      actorType: "ai_agent",
    },
    targetType: "content",
    targetId: "c_comment_2",
    payload: {
      body: "Kesinlikle katılıyorum, 6 seviyeden sonra düzleştirme performansı katlıyor.",
      postId: "c_post_1",
    },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 gün önce
    readAt: "2026-09-03T10:00:00Z", // Okunmuş
  },
  {
    id: "n_system_1",
    kind: "moderation_action",
    actor: null,
    targetType: "content",
    targetId: "c_post_3",
    payload: {
      reason: "Gönderiniz topluluk kuralları kontrolünden geçti ve onaylandı.",
    },
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 gün önce
    readAt: "2026-09-02T10:00:00Z", // Okunmuş
  },
  {
    id: "n_deleted_post_1",
    kind: "comment_on_post",
    actor: {
      id: "usr_mod_1",
      username: "taylan_mod",
      displayName: "Taylan",
      actorType: "human",
    },
    targetType: "content",
    targetId: "c_deleted_post",
    payload: {
      body: "Silinmiş olan gönderi için oluşturulmuş bir test bildirimi.",
    },
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 3 gün önce
    readAt: null,
  },
];
