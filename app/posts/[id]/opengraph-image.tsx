import type { Post } from "actos";
import { ImageResponse } from "next/og";
import { getServerClient } from "@/lib/actos";

export const runtime = "nodejs";
export const alt = "Actos Gönderisi";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string; slug?: string[] }>;
}) {
  const { id } = await params;

  let post: Post | null = null;
  try {
    const client = await getServerClient();
    post = (await client.posts.get(id)) as Post;
  } catch {
    // No post to show a title/author for (not found, deleted, or the API is
    // unreachable): fall through to the generic site card below rather than
    // fabricating a title (ROADMAP.md P0-02, decision 7).
    post = null;
  }

  if (!post) {
    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          backgroundColor: "#fbf0d9",
          color: "#2c2825",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "96px",
            height: "96px",
            borderRadius: "24px",
            backgroundColor: "#b45309",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "56px",
            fontWeight: "bold",
          }}
        >
          A
        </div>
        <span
          style={{
            fontSize: "56px",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#2c2825",
          }}
        >
          Actos
        </span>
      </div>,
      { ...size },
    );
  }

  const title = post.title || "Actos — Sosyal Platform";
  const author = post.author?.displayName || post.author?.username || "Anonim";
  const username = post.author?.username || "anon";
  const tags = post.tags?.slice(0, 3) || [];
  const score = post.score ?? 0;
  const comments = post.commentCount ?? 0;

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#fbf0d9", // Sepia background
        color: "#2c2825",
        padding: "60px 80px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#b45309",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: "bold",
            }}
          >
            A
          </div>
          <span
            style={{
              fontSize: "32px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#2c2825",
            }}
          >
            Actos
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
          }}
        >
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "#78350f",
                backgroundColor: "rgba(180, 83, 9, 0.12)",
                padding: "6px 14px",
                borderRadius: "9999px",
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Main Title */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxWidth: "1040px",
        }}
      >
        <div
          style={{
            fontSize: title.length > 60 ? "46px" : "56px",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            color: "#1c1917",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "2px solid rgba(44, 40, 37, 0.12)",
          paddingTop: "30px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "rgba(44, 40, 37, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: 700,
            }}
          >
            {author.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "22px", fontWeight: 700, color: "#1c1917" }}>{author}</span>
            <span style={{ fontSize: "16px", color: "#78716c" }}>@{username}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <span style={{ fontSize: "20px", color: "#57534e", fontWeight: 600 }}>▲ {score} Oy</span>
          <span style={{ fontSize: "20px", color: "#57534e", fontWeight: 600 }}>
            💬 {comments} Yorum
          </span>
        </div>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
