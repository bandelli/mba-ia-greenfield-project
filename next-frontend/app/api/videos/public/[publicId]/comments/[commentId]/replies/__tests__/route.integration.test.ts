import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import {
  COMMENT_NOT_FOUND_TRIGGER,
  PUBLIC_VIDEO_NOT_FOUND_TRIGGER,
  REPLY_DEPTH_EXCEEDED_TRIGGER,
} from "@/mocks/handlers/videos";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";

const cookieMap = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (name: string) =>
      cookieMap.has(name) ? { name, value: cookieMap.get(name)! } : undefined,
    set: (name: string, value: string) => {
      cookieMap.set(name, value);
    },
    delete: (name: string) => {
      cookieMap.delete(name);
    },
  }),
}));

let POST: (
  req: Request,
  ctx: { params: Promise<{ publicId: string; commentId: string }> }
) => Promise<Response>;

beforeAll(async () => {
  ({ POST } = await import(
    "@/app/api/videos/public/[publicId]/comments/[commentId]/replies/route"
  ));
});

const { setSession } = await import("@/lib/auth/session");

beforeEach(async () => {
  cookieMap.clear();
  await setSession({
    accessToken: "active-at",
    refreshToken: "active-rt",
    userId: "u1",
    email: "alice@example.com",
    channelSlug: "alice",
  });
});

function makeRequest(
  publicId: string,
  commentId: string,
  body: Record<string, unknown>
) {
  return new Request(
    `http://localhost/api/videos/public/${publicId}/comments/${commentId}/replies`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("POST /api/videos/public/[publicId]/comments/[commentId]/replies", () => {
  it("forwards the request body and returns the upstream 201 response unchanged", async () => {
    const res = await POST(makeRequest("pub123", "comment-1", { body: "Concordo!" }), {
      params: Promise.resolve({ publicId: "pub123", commentId: "comment-1" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.body).toBe("Concordo!");
    expect(body).not.toHaveProperty("replies");
  });

  it("passes through a 400 REPLY_DEPTH_EXCEEDED without reshaping", async () => {
    const res = await POST(
      makeRequest("pub123", REPLY_DEPTH_EXCEEDED_TRIGGER, { body: "segunda camada" }),
      {
        params: Promise.resolve({
          publicId: "pub123",
          commentId: REPLY_DEPTH_EXCEEDED_TRIGGER,
        }),
      }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: "REPLY_DEPTH_EXCEEDED" });
  });

  it("passes through a 404 COMMENT_NOT_FOUND without reshaping", async () => {
    const res = await POST(
      makeRequest("pub123", COMMENT_NOT_FOUND_TRIGGER, { body: "oi" }),
      {
        params: Promise.resolve({
          publicId: "pub123",
          commentId: COMMENT_NOT_FOUND_TRIGGER,
        }),
      }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "COMMENT_NOT_FOUND" });
  });

  it("passes through a 404 VIDEO_NOT_FOUND without reshaping", async () => {
    const res = await POST(
      makeRequest(PUBLIC_VIDEO_NOT_FOUND_TRIGGER, "comment-1", { body: "oi" }),
      {
        params: Promise.resolve({
          publicId: PUBLIC_VIDEO_NOT_FOUND_TRIGGER,
          commentId: "comment-1",
        }),
      }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });

  it("passes through a 401 UNAUTHORIZED without reshaping", async () => {
    server.use(
      http.post(
        `${env.API_URL}/videos/:publicId/comments/:commentId/replies`,
        () =>
          HttpResponse.json(
            { statusCode: 401, error: "UNAUTHORIZED", message: "Unauthorized" },
            { status: 401 }
          )
      )
    );

    const res = await POST(makeRequest("pub123", "comment-1", { body: "oi" }), {
      params: Promise.resolve({ publicId: "pub123", commentId: "comment-1" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "UNAUTHORIZED" });
  });
});
