import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerClient, createComment } = vi.hoisted(() => ({
  getServerClient: vi.fn(),
  createComment: vi.fn(),
}));

vi.mock("@/lib/actos", () => ({ getServerClient }));
vi.mock("@/lib/render/comment-tree", () => ({
  renderCommentBody: (comment: unknown) => Promise.resolve(comment),
  renderCommentTree: (comments: unknown) => Promise.resolve(comments),
}));

import { POST } from "@/app/api/comments/route";

describe("POST /api/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createComment.mockResolvedValue({ id: "c_new", body: "A reply" });
    getServerClient.mockResolvedValue({
      comments: { create: createComment },
    });
  });

  it("forwards JSON comments without claiming an idempotency guarantee", async () => {
    const request = new NextRequest("http://localhost/api/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postId: "c_post", body: "  Hello  ", parentId: null }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(createComment).toHaveBeenCalledWith("c_post", {
      body: "Hello",
      parentId: null,
    });
    expect(createComment.mock.calls[0]?.[1]).not.toHaveProperty("idempotencyKey");
  });

  it("passes multipart image files and reply parent through the SDK", async () => {
    const formData = new FormData();
    formData.set("postId", "c_post");
    formData.set("body", "A reply with images");
    formData.set("parentId", "c_parent");
    formData.append("files", new File(["image one"], "one.png", { type: "image/png" }));
    formData.append("files", new File(["image two"], "two.jpg", { type: "image/jpeg" }));

    const response = await POST(
      new NextRequest("http://localhost/api/comments", { method: "POST", body: formData }),
    );

    expect(response.status).toBe(201);
    expect(createComment).toHaveBeenCalledTimes(1);
    const [postId, input] = createComment.mock.calls[0] as [string, Record<string, unknown>];
    expect(postId).toBe("c_post");
    expect(input.body).toBe("A reply with images");
    expect(input.parentId).toBe("c_parent");
    expect(input.files).toHaveLength(2);
    expect(input.files).toEqual(expect.arrayContaining([expect.any(Blob)]));
    expect(input).not.toHaveProperty("idempotencyKey");
  });

  it("rejects more than the backend's four-comment-image limit before calling the SDK", async () => {
    const formData = new FormData();
    formData.set("postId", "c_post");
    formData.set("body", "Too many images");
    for (let index = 0; index < 5; index += 1) {
      formData.append(
        "files",
        new File([`image ${index}`], `image-${index}.png`, { type: "image/png" }),
      );
    }

    const response = await POST(
      new NextRequest("http://localhost/api/comments", { method: "POST", body: formData }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
    expect(createComment).not.toHaveBeenCalled();
  });
});
