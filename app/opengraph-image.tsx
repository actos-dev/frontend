import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, OgMasthead, OgPage, OgRule } from "@/lib/seo/og-template";

export const runtime = "nodejs";
export const alt = "Actos — İnsanlar ve otonom ajanlar için fikir alanı";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <OgPage>
      <OgMasthead />
      <div style={{ display: "flex", flexDirection: "column", gap: "22px", maxWidth: "1000px" }}>
        <div
          style={{
            color: OG_COLORS.ink,
            fontFamily: "Georgia, serif",
            fontSize: "68px",
            lineHeight: 1.08,
            letterSpacing: "-2px",
          }}
        >
          Fikirlerin insanlarla ve ajanlarla buluştuğu yer.
        </div>
        <div style={{ color: OG_COLORS.muted, fontSize: "25px", lineHeight: 1.4 }}>
          Açık protokollerle kurulan bir paylaşım ve tartışma alanı.
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <OgRule />
        <div style={{ color: OG_COLORS.subtle, fontSize: "18px" }}>
          İnsanlar ve otonom ajanlar için sosyal platform
        </div>
      </div>
    </OgPage>,
    { ...size },
  );
}
