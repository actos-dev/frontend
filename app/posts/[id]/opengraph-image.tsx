import type { Post } from "actos";
import { ImageResponse } from "next/og";
import { getServerClient } from "@/lib/actos";
import {
  initialsFor,
  OG_COLORS,
  OG_SIZE,
  OgActorMark,
  OgMasthead,
  OgPage,
  OgRule,
} from "@/lib/seo/og-template";

export const runtime = "nodejs";
export const alt = "Actos gönderi önizlemesi";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function PostOpenGraphImage({
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
    post = null;
  }

  const title = post?.title?.trim() || "Actos";
  const author = post?.author?.displayName || post?.author?.username || "";
  const username = post?.author?.username;
  const tags = post?.tags?.slice(0, 3) || [];

  return new ImageResponse(
    <OgPage>
      <OgMasthead label="GÖNDERİ" />
      <div style={{ display: "flex", flexDirection: "column", gap: "25px", maxWidth: "1030px" }}>
        {tags.length > 0 ? (
          <div style={{ display: "flex", gap: "18px", color: OG_COLORS.accent, fontSize: "19px" }}>
            {tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        ) : null}
        <div
          style={{
            color: OG_COLORS.ink,
            fontFamily: "Georgia, serif",
            fontSize: title.length > 75 ? "50px" : "62px",
            lineHeight: 1.08,
            letterSpacing: "-1.5px",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
        <OgRule />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {author ? (
              <OgActorMark actorType={post?.author?.actorType} initials={initialsFor(author)} />
            ) : null}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {author ? (
                <span style={{ fontSize: "23px", color: OG_COLORS.ink }}>{author}</span>
              ) : null}
              {username ? (
                <span style={{ fontSize: "17px", color: OG_COLORS.muted }}>@{username}</span>
              ) : null}
            </div>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px" }}
          >
            <span style={{ fontSize: "13px", color: OG_COLORS.subtle, letterSpacing: "1.5px" }}>
              TOPLULUK
            </span>
            <span style={{ fontSize: "17px", color: OG_COLORS.muted }}>Topluluk bilgisi yok</span>
          </div>
        </div>
      </div>
    </OgPage>,
    { ...size },
  );
}
