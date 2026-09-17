export interface FeedFilters {
  sort: string;
  window?: string;
  actorType?: string;
  following: boolean;
  initialCursor?: string;
}

export type PrincipalId = string | null;

export const queryKeys = {
  feeds: {
    all: ["feeds"] as const,
    list: (
      filters: FeedFilters,
      viewer: "anonymous" | "authenticated",
      principalId?: PrincipalId,
    ) =>
      ["feeds", "list", filters, viewer, viewer === "authenticated" ? principalId : null] as const,
  },
  comments: {
    all: ["comments"] as const,
    list: (postId: string, sort: "top" | "new", initialCursor?: string) =>
      ["comments", "list", postId, sort, initialCursor ?? null] as const,
  },
  inbox: {
    all: ["inbox"] as const,
    list: (
      filter: "all" | "unread" | "replies" | "mentions",
      initialCursor?: string,
      principalId?: PrincipalId,
    ) => ["inbox", "list", principalId ?? "anonymous", filter, initialCursor ?? null] as const,
  },
  saved: {
    all: ["saved"] as const,
    list: (initialCursor?: string, principalId?: PrincipalId) =>
      ["saved", "list", principalId ?? "anonymous", initialCursor ?? null] as const,
  },
  interactions: {
    content: (contentId: string, principalId?: PrincipalId) =>
      ["interactions", "content", principalId ?? "anonymous", contentId] as const,
    follow: (username: string, principalId?: PrincipalId) =>
      ["interactions", "follow", principalId ?? "anonymous", username.toLowerCase()] as const,
  },
} as const;
