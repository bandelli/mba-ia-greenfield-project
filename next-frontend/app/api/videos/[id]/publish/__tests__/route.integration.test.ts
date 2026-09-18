import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";

const cookieMap = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (name: string) =>
      cookieMap.has(name) ? { name, value: cookieMap.get(name)! } : undefined,
    set: (name: string, value: string) => { cookieMap.set(name, value); },
    delete: (name: string) => { cookieMap.delete(name); },
  }),
}));

let POST: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/videos/[id]/publish/route"));
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

function makeRequest(body: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/videos/pub123/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/videos/[id]/publish", () => {
  it("forwards to upstream and returns the published video", async () => {
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "pub123" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.published_at).not.toBeNull();
  });

  it("passes through a 404 VIDEO_NOT_FOUND without reshaping", async () => {
    server.use(
      http.post(`${env.API_URL}/videos/:id/publish`, () =>
        HttpResponse.json(
          { statusCode: 404, error: "VIDEO_NOT_FOUND", message: "Video not found" },
          { status: 404 }
        )
      )
    );

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });

  it("passes through a 400 VIDEO_NOT_READY without reshaping", async () => {
    server.use(
      http.post(`${env.API_URL}/videos/:id/publish`, () =>
        HttpResponse.json(
          { statusCode: 400, error: "VIDEO_NOT_READY", message: "Video is not ready" },
          { status: 400 }
        )
      )
    );

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "pub123" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_READY" });
  });
});
