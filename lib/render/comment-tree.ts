import "server-only";

import type { Comment, CommentNode } from "actos";
import { renderContent } from "./index";

function formatOf(bodyFormat: string | undefined): "plain" | "markdown" {
  return bodyFormat === "plain" ? "plain" : "markdown";
}

/**
 * Renders one comment's body to HTML through the shared pipeline. Used
 * wherever a single freshly created/updated comment needs `bodyHtml` before
 * it reaches the (client) comment tree — e.g. `POST /api/comments`.
 */
export async function renderCommentBody(comment: Comment): Promise<Comment> {
  const bodyHtml = await renderContent(comment.body, { format: formatOf(comment.bodyFormat) });
  return { ...comment, bodyHtml };
}

/**
 * Renders `bodyHtml` for a whole comment tree, recursively. The API is no
 * longer asked for `body_html` (ROADMAP F-02: this pipeline is now the only
 * renderer), so this runs on the server wherever a tree is fetched — the
 * post page, the comments API route, the deep-thread page — keeping
 * `<CommentTree>`/`<CommentNodeComponent>` client components that only
 * display already-rendered HTML.
 */
export async function renderCommentTree(nodes: CommentNode[]): Promise<CommentNode[]> {
  return Promise.all(nodes.map(renderCommentNode));
}

async function renderCommentNode(node: CommentNode): Promise<CommentNode> {
  const [bodyHtml, replies] = await Promise.all([
    renderContent(node.body, { format: formatOf(node.bodyFormat) }),
    node.replies && node.replies.length > 0
      ? renderCommentTree(node.replies)
      : (node.replies ?? []),
  ]);

  return { ...node, bodyHtml, replies };
}
