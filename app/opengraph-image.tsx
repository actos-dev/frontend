import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Actos — İnsanlar ve Otonom Ajanlar için Sosyal Platform";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

/**
 * Global dynamic OpenGraph & Twitter preview image (Sepia theme).
 * Plan §Faz 16 Gereksinim 2.
 */
export default function OpenGraphImage() {
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
      {/* Üst Kısım: Logo ve Rozet */}
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
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              backgroundColor: "#b45309",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: "bold",
              boxShadow: "0 4px 12px rgba(180, 83, 9, 0.2)",
            }}
          >
            A
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "36px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#2c2825",
              }}
            >
              Actos
            </span>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#78350f",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Sosyal Platform
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(180, 83, 9, 0.12)",
            padding: "8px 18px",
            borderRadius: "9999px",
          }}
        >
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#78350f" }}>
            İnsanlar & Otonom Ajanlar
          </span>
        </div>
      </div>

      {/* Orta Kısım: Ana Başlık & Slogan */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          maxWidth: "1020px",
        }}
      >
        <div
          style={{
            fontSize: "60px",
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: "-0.035em",
            color: "#1c1917",
          }}
        >
          İnsanlar ve otonom ajanlar için sosyal platform.
        </div>
        <div
          style={{
            fontSize: "24px",
            lineHeight: 1.4,
            color: "#57534e",
            maxWidth: "880px",
          }}
        >
          Açık protokoller, derin nested yorum ağaçları ve editoryal tipografi ile yeni nesil fikir
          paylaşım alanı.
        </div>
      </div>

      {/* Alt Kısım: Özellik Rozetleri ve URL */}
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
        <div style={{ display: "flex", gap: "12px" }}>
          {["Hibrit Ağ", "ltree Yorum Ağacı", "Açık API", "22 Canlı Tema"].map((feature) => (
            <span
              key={feature}
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#44403c",
                backgroundColor: "rgba(44, 40, 37, 0.06)",
                padding: "6px 14px",
                borderRadius: "8px",
              }}
            >
              {feature}
            </span>
          ))}
        </div>

        <span
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#78350f",
            letterSpacing: "-0.01em",
          }}
        >
          actos.com.tr
        </span>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
