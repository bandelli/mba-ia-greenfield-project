import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { http, HttpResponse } from "msw";

import { env } from "@/lib/env";
import { server } from "@/mocks/server";
import { PUBLIC_VIDEO_NOT_FOUND_TRIGGER } from "@/mocks/handlers/videos";

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

let GET: (
  req: Request,
  ctx: { params: Promise<{ publicId: string }> }
) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/videos/public/[publicId]/route"));
});

beforeEach(() => {
  cookieMap.clear();
});

describe("GET /api/videos/public/[publicId]", () => {
  it("forwards to the upstream endpoint and returns the same format", async () => {
    const res = await GET(
      new Request("http://localhost/api/videos/public/pub123"),
      { params: Promise.resolve({ publicId: "pub123" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.public_id).toBe("pub123");
    expect(body).toMatchObject({
      title: expect.any(String),
      views: expect.any(Number),
      channel: { nickname: expect.any(String), name: expect.any(String) },
    });
  });

  it("passes through a 404 VIDEO_NOT_FOUND without reshaping", async () => {
    const res = await GET(
      new Request(
        `http://localhost/api/videos/public/${PUBLIC_VIDEO_NOT_FOUND_TRIGGER}`
      ),
      { params: Promise.resolve({ publicId: PUBLIC_VIDEO_NOT_FOUND_TRIGGER }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });

  it("forwards the session's Authorization header when logged in", async () => {
    const { setSession } = await import("@/lib/auth/session");
    await setSession({
      accessToken: "active-at",
      refreshToken: "active-rt",
      userId: "u1",
      email: "alice@example.com",
      channelSlug: "alice",
    });

    let receivedAuthHeader: string | null = null;
    server.use(
      http.get(`${env.API_URL}/videos/public/:publicId`, ({ request }) => {
        receivedAuthHeader = request.headers.get("authorization");
        return HttpResponse.json(
          { public_id: "pub123", currentUserReaction: "like" },
          { status: 200 }
        );
      })
    );

    await GET(new Request("http://localhost/api/videos/public/pub123"), {
      params: Promise.resolve({ publicId: "pub123" }),
    });

    expect(receivedAuthHeader).toBe("Bearer active-at");
  });

  it("does not forward an Authorization header when anonymous", async () => {
    let receivedAuthHeader: string | null | undefined = undefined;
    server.use(
      http.get(`${env.API_URL}/videos/public/:publicId`, ({ request }) => {
        receivedAuthHeader = request.headers.get("authorization");
        return HttpResponse.json(
          { public_id: "pub123", currentUserReaction: null },
          { status: 200 }
        );
      })
    );

    await GET(new Request("http://localhost/api/videos/public/pub123"), {
      params: Promise.resolve({ publicId: "pub123" }),
    });

    expect(receivedAuthHeader).toBeNull();
  });
});
