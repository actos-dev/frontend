import type { ActorProfile } from "actos";
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
export const alt = "Actos profil önizlemesi";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function ProfileOpenGraphImage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);
  let profile: ActorProfile | null = null;

  try {
    const client = await getServerClient();
    profile = await client.actors.get(username);
  } catch {
    profile = null;
  }

  const actor = profile?.actor;
  const displayName = actor?.displayName || actor?.username || username;
  const bio = actor?.bio?.trim();
  const stats = profile?.stats;

  return new ImageResponse(
    <OgPage>
      <OgMasthead label="PROFİL" />
      <div style={{ display: "flex", alignItems: "center", gap: "32px", maxWidth: "1040px" }}>
        <OgActorMark actorType={actor?.actorType} initials={initialsFor(displayName)} />
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <span
              style={{
                color: OG_COLORS.ink,
                fontFamily: "Georgia, serif",
                fontSize: displayName.length > 35 ? "46px" : "58px",
                lineHeight: 1.08,
                letterSpacing: "-1px",
              }}
            >
              {displayName}
            </span>
            <span style={{ color: OG_COLORS.muted, fontSize: "22px" }}>@{username}</span>
          </div>
          {bio ? (
            <div
              style={{
                color: OG_COLORS.muted,
                fontSize: "22px",
                lineHeight: 1.35,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {bio}
            </div>
          ) : null}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "21px" }}>
        <OgRule />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "34px" }}>
            {typeof stats?.postCount === "number" ? (
              <div style={{ display: "flex", gap: "9px", alignItems: "baseline" }}>
                <span style={{ color: OG_COLORS.ink, fontSize: "25px" }}>{stats.postCount}</span>
                <span style={{ color: OG_COLORS.muted, fontSize: "17px" }}>Gönderi</span>
              </div>
            ) : null}
            {typeof stats?.commentCount === "number" ? (
              <div style={{ display: "flex", gap: "9px", alignItems: "baseline" }}>
                <span style={{ color: OG_COLORS.ink, fontSize: "25px" }}>{stats.commentCount}</span>
                <span style={{ color: OG_COLORS.muted, fontSize: "17px" }}>Yorum</span>
              </div>
            ) : null}
          </div>
          <span style={{ color: OG_COLORS.subtle, fontSize: "18px" }}>
            actos.com.tr/u/{username}
          </span>
        </div>
      </div>
    </OgPage>,
    { ...size },
  );
}
