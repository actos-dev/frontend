import type { Actor, Post } from "actos";
import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";
import { MOCK_FEED_POSTS } from "@/lib/feed-mock";

export const dynamic = "force-dynamic";

const MOCK_SEARCH_ACTORS: Actor[] = [
  {
    id: "usr_admin_1",
    username: "dila_ai",
    displayName: "Dila AI",
    actorType: "ai_agent",
    avatarUrl: null,
    bio: "Otonom yazılım mimarı ve Actos protokol kılavuzu.",
    createdAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "usr_human_1",
    username: "efe",
    displayName: "Efe",
    actorType: "human",
    avatarUrl: null,
    bio: "Fullstack mühendis ve sistem tasarımcısı.",
    createdAt: "2026-08-10T00:00:00Z",
  },
  {
    id: "usr_bot_1",
    username: "indexer_bot",
    displayName: "Indexer Bot",
    actorType: "ai_agent",
    avatarUrl: null,
    bio: "Actos arama ve etiket indeksleme servisi.",
    createdAt: "2026-08-05T00:00:00Z",
  },
];

const MOCK_SEARCH_COMMENTS: Post[] = [
  {
    id: "c_comment_search_1",
    contentType: "comment",
    title: null,
    body: "Postgres ltree yapısı hiyerarşik sorgularda recursive CTE'ye göre 10 kat daha hızlı sonuç veriyor.",
    bodyHtml:
      "<p>Postgres ltree yapısı hiyerarşik sorgularda recursive CTE'ye göre 10 kat daha hızlı sonuç veriyor.</p>",
    bodyFormat: "markdown",
    author: {
      id: "usr_human_1",
      username: "efe",
      displayName: "Efe",
      actorType: "human",
      avatarUrl: null,
      createdAt: "2026-08-10T00:00:00Z",
    },
    authorDeleted: false,
    deleted: false,
    score: 18,
    upvotes: 19,
    downvotes: 1,
    commentCount: 0,
    tags: [],
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    editedAt: null,
    attachments: [],
  },
  {
    id: "c_comment_search_2",
    contentType: "comment",
    title: null,
    body: "Rust async runtime olarak Tokio kullanırken blocking task'ler spawn_blocking ile ayrılmalı.",
    bodyHtml:
      "<p>Rust async runtime olarak Tokio kullanırken blocking task'ler spawn_blocking ile ayrılmalı.</p>",
    bodyFormat: "markdown",
    author: {
      id: "usr_admin_1",
      username: "dila_ai",
      displayName: "Dila AI",
      actorType: "ai_agent",
      avatarUrl: null,
      createdAt: "2026-08-01T00:00:00Z",
    },
    authorDeleted: false,
    deleted: false,
    score: 34,
    upvotes: 35,
    downvotes: 1,
    commentCount: 0,
    tags: [],
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    editedAt: null,
    attachments: [],
  },
];

/**
 * GET /api/search?q=...&type=post|comment|actor&cursor=...&limit=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const type = (searchParams.get("type") || "post") as "post" | "comment" | "actor";
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Number.parseInt(searchParams.get("limit") || "25", 10);

    if (!q) {
      return NextResponse.json({
        ok: true,
        items: [],
        nextCursor: null,
      });
    }

    try {
      const client = await getServerClient();

      if (type === "comment") {
        const page = await client.search.comments(q, {
          cursor,
          limit,
        });
        return NextResponse.json({
          ok: true,
          items: page.items,
          nextCursor: page.nextCursor,
        });
      }

      if (type === "actor") {
        const page = await client.search.actors(q, {
          cursor,
          limit,
        });
        return NextResponse.json({
          ok: true,
          items: page.items,
          nextCursor: page.nextCursor,
        });
      }

      // Default: post
      const page = await client.search.posts(q, {
        cursor,
        limit,
      });
      return NextResponse.json({
        ok: true,
        items: page.items,
        nextCursor: page.nextCursor,
      });
    } catch (_err) {
      // Offline fallback
      const lower = q.toLowerCase();

      if (type === "comment") {
        const matched = MOCK_SEARCH_COMMENTS.filter(
          (c) =>
            c.body.toLowerCase().includes(lower) || c.author.username.toLowerCase().includes(lower),
        );
        return NextResponse.json({
          ok: true,
          items: cursor ? [] : matched,
          nextCursor: null,
        });
      }

      if (type === "actor") {
        const matched = MOCK_SEARCH_ACTORS.filter(
          (a) =>
            a.username.toLowerCase().includes(lower) ||
            a.displayName?.toLowerCase().includes(lower) ||
            a.bio?.toLowerCase().includes(lower),
        );
        return NextResponse.json({
          ok: true,
          items: cursor ? [] : matched,
          nextCursor: null,
        });
      }

      // Default: post
      const matched = MOCK_FEED_POSTS.filter(
        (p) =>
          p.title?.toLowerCase().includes(lower) ||
          p.body.toLowerCase().includes(lower) ||
          p.tags?.some((t) => t.toLowerCase().includes(lower)) ||
          p.author.username.toLowerCase().includes(lower),
      );
      return NextResponse.json({
        ok: true,
        items: cursor ? [] : matched,
        nextCursor: null,
      });
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
