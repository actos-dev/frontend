import type { CommentNode, Post } from "actos";
import type { NotificationRow } from "@/components/inbox/notification-card";
import type { VoteMap } from "@/lib/votes";

export interface FeedQueryPage {
  items: Post[];
  nextCursor: string | null;
  votes: VoteMap;
}

export interface CommentQueryPage {
  items: CommentNode[];
  nextCursor: string | null;
}

export interface SavedQueryPage {
  items: Post[];
  nextCursor: string | null;
  votes: VoteMap;
}

export interface InboxQueryPage {
  notifications: NotificationRow[];
  nextCursor: string | null;
  unreadCount: number;
}

export interface ContentInteraction {
  score: number;
  userVote: -1 | 0 | 1;
  /** null means this view has not received saved-state information yet. */
  saved: boolean | null;
}

export interface ApiProblem extends Error {
  status: number;
  code?: string;
  detail?: string;
  /** Seconds from a 429 `Retry-After`, when the server sent one. */
  retryAfter?: number | null;
}
