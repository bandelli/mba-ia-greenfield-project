import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";

import { VIDEO_THUMBNAIL_NOT_FOUND_TRIGGER } from "@/mocks/handlers/videos";

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
  ctx: { params: Promise<{ id: string }> }
) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/videos/[id]/thumbnail-url/route"));
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

describe("GET /api/videos/[id]/thumbnail-url", () => {
  it("forwards the session's access token and returns the upstream URL", async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get(`${env.API_URL}/videos/:id/thumbnail-url`, ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json(
          { url: "https://storage.example.com/thumbnail-presigned-url" },
          { status: 200 }
        );
      })
    );

    const res = await GET(
      new Request("http://localhost/api/videos/pub123/thumbnail-url"),
      { params: Promise.resolve({ id: "pub123" }) }
    );

    expect(res.status).toBe(200);
    expect(capturedAuth).toBe("Bearer active-at");
    const body = await res.json();
    expect(typeof body.url).toBe("string");
    expect((body.url as string).length).toBeGreaterThan(0);
  });

  it("passes through a 404 VIDEO_NOT_FOUND without reshaping", async () => {
    server.use(
      http.get(`${env.API_URL}/videos/:id/thumbnail-url`, () =>
        HttpResponse.json(
          {
            statusCode: 404,
            error: "VIDEO_NOT_FOUND",
            message: "Video not found",
          },
          { status: 404 }
        )
      )
    );

    const res = await GET(
      new Request(
        "http://localhost/api/videos/does-not-exist/thumbnail-url"
      ),
      { params: Promise.resolve({ id: "does-not-exist" }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });

  it("passes through a 404 VIDEO_THUMBNAIL_NOT_FOUND without reshaping", async () => {
    const res = await GET(
      new Request(
        `http://localhost/api/videos/${VIDEO_THUMBNAIL_NOT_FOUND_TRIGGER}/thumbnail-url`
      ),
      { params: Promise.resolve({ id: VIDEO_THUMBNAIL_NOT_FOUND_TRIGGER }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_THUMBNAIL_NOT_FOUND" });
  });
});
