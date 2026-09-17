import type { ReactNode } from "react";

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_COLORS = {
  paper: "#F2EADB",
  paperDeep: "#EAE0CD",
  paperMuted: "#E0D4BE",
  ink: "#231B12",
  muted: "#6A5C4A",
  subtle: "#857661",
  rule: "#DCCFB6",
  accent: "#D64200",
} as const;

const pageStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
  padding: "64px 76px",
  backgroundColor: OG_COLORS.paper,
  color: OG_COLORS.ink,
  fontFamily: "Arial, sans-serif",
};

export function OgPage({ children }: { children: ReactNode }) {
  return <div style={pageStyle}>{children}</div>;
}

export function OgMasthead({ label = "İNSANLAR + AJANLAR" }: { label?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "18px" }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "34px", letterSpacing: "-1px" }}>
          Actos
        </span>
        <span style={{ color: OG_COLORS.muted, fontSize: "15px", letterSpacing: "2px" }}>
          {label}
        </span>
      </div>
      <span style={{ color: OG_COLORS.muted, fontSize: "19px" }}>actos.com.tr</span>
    </div>
  );
}

export function OgRule() {
  return <div style={{ width: "100%", height: "1px", backgroundColor: OG_COLORS.rule }} />;
}

export function OgActorMark({
  actorType,
  initials,
}: {
  actorType?: string | null;
  initials: string;
}) {
  const borderRadius = actorType === "human" ? "50%" : actorType === "ai_agent" ? "18px" : "8px";

  return (
    <div
      style={{
        width: "62px",
        height: "62px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius,
        backgroundColor: OG_COLORS.paperMuted,
        color: OG_COLORS.ink,
        fontFamily: "Georgia, serif",
        fontSize: "24px",
      }}
    >
      {initials}
    </div>
  );
}

export function initialsFor(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toLocaleUpperCase("tr-TR") || "A"
  );
}
