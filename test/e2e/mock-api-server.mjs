// Deterministic Actos API stand-in for the mocked Playwright suite.
//
// The mocked suite intercepts browser requests with `page.route`, but the
// overhauled app renders its list/detail pages as Server Components: their
// data comes from a server-side SDK call to `ACTOS_API_URL`, which the browser
// cannot intercept. Pointing `ACTOS_API_URL` at this server keeps the suite
// independent of a running backend while still giving RSC pages real,
// deterministic data (and the moderation pages their anti-leak 404s).
//
// It implements only the Actos API endpoints the mocked specs exercise. Every
// other path answers a 404 problem document, exactly like the real API.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_API_PORT || 3199);

const POST_ID = "post_journey_456";
const POST_TITLE = "E2E Yolculuk Test Gönderisi";
const POST_BODY = "**Playwright** ile oluşturulmuş uçtan uca gönderi gövdesi.";

const AUTHOR = {
  actor_type: "human",
  avatar_url: null,
  bio: null,
  created_at: "2026-09-01T00:00:00.000000+00:00",
  display_name: "Deniz",
  id: "usr_author_deniz",
  username: "deniz",
};

const POST = {
  attachments: [],
  author: AUTHOR,
  author_deleted: false,
  body: POST_BODY,
  body_format: "markdown",
  body_html: null,
  comment_count: 0,
  community: null,
  content_type: "post",
  created_at: "2026-09-01T00:00:00.000000+00:00",
  cross_post: null,
  deleted: false,
  downvotes: 0,
  edited_at: null,
  id: POST_ID,
  is_cross_post: false,
  score: 7,
  tags: ["test", "e2e"],
  title: POST_TITLE,
  upvotes: 7,
};

function problem(status, code, detail) {
  return {
    type: `https://docs.actos.dev/errors/${code.toLowerCase()}`,
    title: detail,
    status,
    detail,
    code,
  };
}

function send(res, status, body) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function notFound(res) {
  send(res, 404, problem(404, "NOT_FOUND", "Not Found"));
}

function isAuthorized(req) {
  return Boolean(req.headers.authorization?.startsWith("Bearer "));
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  if (req.method === "GET" && path === "/health") {
    send(res, 200, { ok: true });
    return;
  }

  // Anonymous callers get a 401 problem document; an authenticated caller is a
  // regular, non-moderator actor with no permissions, so `/mod*` still 404s.
  if (req.method === "GET" && path === "/auth/whoami") {
    if (!isAuthorized(req)) {
      send(res, 401, problem(401, "MISSING_CREDENTIALS", "no credentials provided"));
      return;
    }
    send(res, 200, {
      actor: {
        actor_type: "human",
        avatar_url: null,
        bio: null,
        created_at: "2026-09-01T00:00:00.000000+00:00",
        display_name: "Standard User",
        id: "usr_standard",
        username: "standard_user",
      },
      permissions: [],
    });
    return;
  }

  if (req.method === "GET" && (path === "/feed" || path === "/feed/following")) {
    send(res, 200, { next_cursor: null, posts: [POST] });
    return;
  }

  if (req.method === "GET" && path === `/posts/${POST_ID}`) {
    send(res, 200, POST);
    return;
  }

  if (req.method === "GET" && path === `/posts/${POST_ID}/comments`) {
    send(res, 200, { comments: [], next_cursor: null });
    return;
  }

  if (req.method === "GET" && path === "/me/votes") {
    send(res, 200, { votes: {} });
    return;
  }

  if (req.method === "GET" && path === "/actors") {
    send(res, 200, { actors: [], next_cursor: null });
    return;
  }

  if (req.method === "GET" && path === "/tags") {
    send(res, 200, { tags: [], next_cursor: null });
    return;
  }

  if (req.method === "GET" && path === "/tags/search") {
    send(res, 200, { tags: [] });
    return;
  }

  if (req.method === "GET" && path === "/search") {
    send(res, 200, { items: [], next_cursor: null });
    return;
  }

  notFound(res);
});

server.listen(PORT, "127.0.0.1", () => {
  // Playwright's webServer readiness check reads this line, not stdout parsing,
  // but the line makes a manually-started server obvious.
  console.log(`[mock-api] listening on http://127.0.0.1:${PORT}`);
});
