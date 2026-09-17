import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, OgMasthead, OgPage, OgRule } from "@/lib/seo/og-template";

export const runtime = "nodejs";
export const alt = "Actos etiket önizlemesi";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function TagOpenGraphImage({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const tagName = decodeURIComponent(rawName).toLowerCase();

  return new ImageResponse(
    <OgPage>
      <OgMasthead label="ETİKET" />
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <span
          style={{
            color: OG_COLORS.accent,
            fontFamily: "Georgia, serif",
            fontSize: "28px",
          }}
        >
          ETİKET
        </span>
        <div
          style={{
            color: OG_COLORS.ink,
            fontFamily: "Georgia, serif",
            fontSize: tagName.length > 24 ? "58px" : "76px",
            lineHeight: 1.08,
            letterSpacing: "-1.5px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          #{tagName}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "21px" }}>
        <OgRule />
        <span style={{ color: OG_COLORS.subtle, fontSize: "18px" }}>actos.com.tr/t/{tagName}</span>
      </div>
    </OgPage>,
    { ...size },
  );
}
