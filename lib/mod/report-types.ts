import type { ActorSummary, Report } from "actos";

export interface ReportTargetPreview {
  kind: "post" | "comment";
  title?: string | null;
  excerpt: string;
  author?: ActorSummary | null;
  href?: string | null;
  unavailable?: boolean;
}

export interface EnrichedReport extends Report {
  targetPreview?: ReportTargetPreview | null;
  targetReportCount?: number;
}
