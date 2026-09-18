import "server-only";

import type { Actos, Report } from "actos";
import type { EnrichedReport, ReportTargetPreview } from "@/lib/mod/report-types";

function cleanExcerpt(value: string | null | undefined, maxLength = 220): string {
  const text = (value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

async function targetPreview(client: Actos, report: Report): Promise<ReportTargetPreview | null> {
  try {
    if (report.targetType === "post") {
      const post = await client.posts.get(report.targetId);
      return {
        kind: "post",
        title: post.title,
        excerpt: cleanExcerpt(post.body),
        author: post.author,
        href: `/posts/${post.id}`,
      };
    }

    if (report.targetType === "comment") {
      const detail = await client.comments.get(report.targetId);
      const comment = detail.comment;
      const rootPostId = detail.ancestors?.[0]?.id;
      return {
        kind: "comment",
        excerpt: cleanExcerpt(comment.body),
        author: comment.author,
        href: rootPostId ? `/posts/${rootPostId}/comments/${comment.id}` : null,
      };
    }

    return null;
  } catch {
    return {
      kind: report.targetType === "comment" ? "comment" : "post",
      excerpt: "",
      unavailable: true,
    };
  }
}

/** Backend 0.2 reports only carry target ids, so enrich the visible page. */
export async function enrichReports(client: Actos, reports: Report[]): Promise<EnrichedReport[]> {
  const counts = new Map<string, number>();
  for (const report of reports) {
    const key = `${report.targetType}:${report.targetId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Promise.all(
    reports.map(async (report) => ({
      ...report,
      targetPreview: await targetPreview(client, report),
      targetReportCount: counts.get(`${report.targetType}:${report.targetId}`) ?? 1,
    })),
  );
}
