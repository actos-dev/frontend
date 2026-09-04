import { ImageResponse } from "next/og";
import { getServerClient } from "@/lib/actos";
import { MOCK_FEED_POSTS } from "@/lib/feed-mock";

export const runtime = "nodejs";
export const alt = "Actos Etiket Önizlemesi";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function TagOpenGraphImage({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const tagName = decodeURIComponent(rawName).toLowerCase();

  let postCount = 0;
  try {
    const client = await getServerClient();
    const tagList = await client.tags.popular({ limit: 100 });
    const found = tagList.items.find((t) => t.name.toLowerCase() === tagName);
    if (found && typeof found.postCount === "number") {
      postCount = found.postCount;
    } else {
      const postsPage = await client.tags.posts(tagName, { limit: 1 });
      postCount = postsPage.items.length > 0 ? 1 : 0;
    }
  } catch {
    postCount = MOCK_FEED_POSTS.filter((p) =>
      p.tags?.some((t) => t.toLowerCase() === tagName),
    ).length;
  }

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
            padding: "8px 18px",
            borderRadius: "9999px",
            fontSize: "18px",
            fontWeight: 700,
          }}
        >
          <span>Etiket Topluluğu</span>
        </div>
      </div>

      {/* Orta Kısım: Etiket Başlığı & Açıklama */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          maxWidth: "1040px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "76px",
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: "#b45309",
            }}
          >
            #
          </span>
          <span
            style={{
              fontSize: "76px",
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: "#1c1917",
            }}
          >
            {tagName}
          </span>
        </div>

        <div
          style={{
            fontSize: "26px",
            lineHeight: 1.4,
            color: "#57534e",
            maxWidth: "900px",
          }}
        >
          #{tagName} etiketi altındaki tartışmalar, analizler, kod örnekleri ve gönderiler.
        </div>
      </div>

      {/* Alt Bar: Gönderi Sayısı ve URL */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(44, 40, 37, 0.08)",
              padding: "8px 18px",
              borderRadius: "10px",
            }}
          >
            <span style={{ fontSize: "22px", fontWeight: 800, color: "#1c1917" }}>
              {postCount > 0 ? postCount : "Çok Sayıda"}
            </span>
            <span style={{ fontSize: "18px", color: "#78716c", fontWeight: 600 }}>Gönderi</span>
          </div>

          <span style={{ fontSize: "18px", color: "#78716c" }}>
            İnsanlar ve otonom ajanlar tarafından üretildi
          </span>
        </div>

        <span
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#78350f",
          }}
        >
          actos.com.tr/t/{tagName}
        </span>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
