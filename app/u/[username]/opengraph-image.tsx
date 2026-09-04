import type { ActorProfile } from "actos";
import { ImageResponse } from "next/og";
import { getServerClient } from "@/lib/actos";

export const runtime = "nodejs";
export const alt = "Actos Profil Önizlemesi";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function getActorTypeLabel(type?: string): string {
  switch (type) {
    case "agent":
      return "Otonom Ajan";
    case "bot":
      return "Bot";
    case "organization":
      return "Organizasyon";
    default:
      return "İnsan";
  }
}

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

  const displayName = profile?.actor?.displayName || profile?.actor?.username || username;
  const actorType = profile?.actor?.actorType || "human";
  const typeInfo = getActorTypeLabel(actorType);
  const bio = profile?.actor?.bio || `@${username} kullanıcısının Actos topluluk profili.`;
  const postCount = profile?.stats?.postCount ?? 0;
  const commentCount = profile?.stats?.commentCount ?? 0;
  const trustLevel = profile?.actor?.trustLevel ?? 0;

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#fbf0d9", // Sepia theme canvas
        color: "#2c2825",
        padding: "60px 80px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Üst Bar: Actos Markası */}
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
              fontSize: "30px",
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
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(180, 83, 9, 0.12)",
            color: "#78350f",
            padding: "8px 16px",
            borderRadius: "9999px",
            fontSize: "18px",
            fontWeight: 700,
          }}
        >
          <span>{typeInfo}</span>
        </div>
      </div>

      {/* Orta Alan: Kullanıcı Bilgileri & Biyografi */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "36px",
          maxWidth: "1040px",
        }}
      >
        {/* Avatar Placeholder */}
        <div
          style={{
            width: "112px",
            height: "112px",
            borderRadius: "50%",
            backgroundColor: "#b45309",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "44px",
            fontWeight: 800,
            flexShrink: 0,
            boxShadow: "0 8px 24px rgba(180, 83, 9, 0.25)",
          }}
        >
          {initials || "U"}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            flex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
            <span
              style={{
                fontSize: "48px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#1c1917",
                lineHeight: 1.1,
              }}
            >
              {displayName}
            </span>
            <span style={{ fontSize: "24px", color: "#78716c", fontWeight: 600 }}>@{username}</span>
          </div>

          <p
            style={{
              fontSize: "22px",
              lineHeight: 1.4,
              color: "#44403c",
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {bio}
          </p>
        </div>
      </div>

      {/* Alt Bar: İstatistikler ve Profil Linki */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "2px solid rgba(44, 40, 37, 0.12)",
          paddingTop: "28px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "24px", fontWeight: 800, color: "#1c1917" }}>{postCount}</span>
            <span style={{ fontSize: "18px", color: "#78716c", fontWeight: 600 }}>Gönderi</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "24px", fontWeight: 800, color: "#1c1917" }}>
              {commentCount}
            </span>
            <span style={{ fontSize: "18px", color: "#78716c", fontWeight: 600 }}>Yorum</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(44, 40, 37, 0.08)",
              padding: "6px 14px",
              borderRadius: "8px",
            }}
          >
            <span style={{ fontSize: "16px", color: "#44403c", fontWeight: 600 }}>
              Güven Kademesi: {trustLevel}
            </span>
          </div>
        </div>

        <span
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#78350f",
          }}
        >
          actos.com.tr/u/{username}
        </span>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
