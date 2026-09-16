/**
 * The Actos mention/tag pass, as a remark plugin.
 *
 * This must match markstone's Actos extension exactly — regexes, boundary
 * rules and all — so that swapping this module out for markstone's Actos
 * family later (see `lib/render/index.ts`) changes nothing a reader sees.
 * The reference implementation is `markstone/actos/src/ast_pass.rs`; every
 * rule below cites the line of logic it mirrors.
 */

interface TreeNode {
  type: string;
  children?: TreeNode[];
  value?: string;
  [key: string]: unknown;
}

/** Mirrors `ck_actors_username_format` via markstone's `USERNAME_PATTERN`. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

/** Mirrors `ck_tags_name_format` via markstone's `TAG_PATTERN`. */
export const TAG_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;

// The candidate run after `@`/`#` is Unicode letters, digits, `_` or `-`
// (mirrors Rust's `char::is_alphanumeric() || c == '_' || c == '-'`). It is
// intentionally broader than USERNAME_PATTERN/TAG_PATTERN: if the whole run
// doesn't validate, the entire thing stays plain text — there is no retry
// against a shorter prefix.
const CANDIDATE_CHAR = /[\p{L}\p{N}_-]/u;

// The preceding character must not be `[a-zA-Z0-9_]`, or `mail@example.com`
// would be read as a mention.
const FORBIDDEN_PRECEDING = /[a-zA-Z0-9_]/;

type SplitPiece =
  | { kind: "text"; value: string }
  | { kind: "mention"; username: string }
  | { kind: "tag"; name: string };

/**
 * Splits one text node's literal value into text/mention/tag pieces.
 * Exported for tests that pin this against markstone's `split_text_node`.
 */
export function splitMentionsAndTags(value: string): SplitPiece[] {
  if (!value.includes("@") && !value.includes("#")) {
    return [{ kind: "text", value }];
  }

  const chars = Array.from(value);
  const len = chars.length;
  const result: SplitPiece[] = [];

  let textStart = 0;
  let prevChar: string | null = null;
  let i = 0;

  while (i < len) {
    const ch = chars[i];

    if (ch === "@" || ch === "#") {
      const isMention = ch === "@";
      const precedingForbidden = prevChar !== null && FORBIDDEN_PRECEDING.test(prevChar);

      if (!precedingForbidden) {
        let candEnd = i + 1;
        while (candEnd < len && CANDIDATE_CHAR.test(chars[candEnd])) {
          candEnd += 1;
        }
        const candidate = chars.slice(i + 1, candEnd).join("");
        const isValid = isMention ? USERNAME_PATTERN.test(candidate) : TAG_PATTERN.test(candidate);

        if (isValid) {
          if (i > textStart) {
            result.push({ kind: "text", value: chars.slice(textStart, i).join("") });
          }
          result.push(
            isMention ? { kind: "mention", username: candidate } : { kind: "tag", name: candidate },
          );
          i = candEnd;
          textStart = i;
          prevChar = candidate.length > 0 ? candidate[candidate.length - 1] : ch;
          continue;
        }
      }
    }

    prevChar = ch;
    i += 1;
  }

  if (textStart < len) {
    result.push({ kind: "text", value: chars.slice(textStart).join("") });
  }

  return result.length > 0 ? result : [{ kind: "text", value }];
}

function pieceToNode(piece: SplitPiece): TreeNode {
  if (piece.kind === "mention") {
    return {
      type: "link",
      url: `/u/${piece.username}`,
      children: [{ type: "text", value: `@${piece.username}` }],
      data: { hProperties: { className: ["mention"] } },
    };
  }
  if (piece.kind === "tag") {
    return {
      type: "link",
      url: `/t/${piece.name}`,
      children: [{ type: "text", value: `#${piece.name}` }],
      data: { hProperties: { className: ["tag"] } },
    };
  }
  return { type: "text", value: piece.value };
}

/**
 * Non-recursive-in-spirit tree walk mirroring `transform_node` in
 * `ast_pass.rs`: mentions/tags are extracted from `text` nodes everywhere
 * except inside link text (mdast represents autolinks as `link` nodes too,
 * so this also covers those), code spans and code blocks (neither of which
 * carry a `children` array of their own, so they're skipped automatically).
 */
function walk(node: TreeNode, inLink: boolean): void {
  if (!Array.isArray(node.children)) return;

  const nextChildren: TreeNode[] = [];
  for (const child of node.children) {
    const childIsLink = child.type === "link" || child.type === "linkReference";

    if (Array.isArray(child.children)) {
      walk(child, inLink || childIsLink);
      nextChildren.push(child);
    } else if (!inLink && child.type === "text" && typeof child.value === "string") {
      for (const piece of splitMentionsAndTags(child.value)) {
        nextChildren.push(pieceToNode(piece));
      }
    } else {
      nextChildren.push(child);
    }
  }
  node.children = nextChildren;
}

/** Remark plugin: rewrites `@username` into `/u/<name>` and `#tag` into `/t/<tag>`. */
export function remarkMentionsAndTags() {
  return (tree: unknown) => {
    walk(tree as TreeNode, false);
  };
}
