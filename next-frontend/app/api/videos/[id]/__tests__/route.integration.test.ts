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

let GET: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let PATCH: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

beforeAll(async () => {
  ({ GET, PATCH } = await import("@/app/api/videos/[id]/route"));
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

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/videos/pub123", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/videos/[id]", () => {
  it("forwards the session's access token and returns the upstream video", async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get(`${env.API_URL}/videos/:id`, ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json({ id: "video-1", public_id: "pub123" }, { status: 200 });
      })
    );

    const res = await GET(new Request("http://localhost/api/videos/pub123"), {
      params: Promise.resolve({ id: "pub123" }),
    });

    expect(res.status).toBe(200);
    expect(capturedAuth).toBe("Bearer active-at");
    const body = await res.json();
    expect(body.public_id).toBe("pub123");
  });

  it("passes through a 404 VIDEO_NOT_FOUND without reshaping", async () => {
    server.use(
      http.get(`${env.API_URL}/videos/:id`, () =>
        HttpResponse.json(
          { statusCode: 404, error: "VIDEO_NOT_FOUND", message: "Video not found" },
          { status: 404 }
        )
      )
    );

    const res = await GET(
      new Request("http://localhost/api/videos/does-not-exist"),
      { params: Promise.resolve({ id: "does-not-exist" }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });
});

describe("PATCH /api/videos/[id]", () => {
  it("forwards the body and returns the upstream's 200 response", async () => {
    const res = await PATCH(makeRequest({ title: "New title" }), {
      params: Promise.resolve({ id: "pub123" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("New title");
  });

  it("forwards the session's access token as a Bearer header", async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.patch(`${env.API_URL}/videos/:id`, ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json({ id: "video-1" }, { status: 200 });
      })
    );

    await PATCH(makeRequest({ title: "x" }), {
      params: Promise.resolve({ id: "pub123" }),
    });

    expect(capturedAuth).toBe("Bearer active-at");
  });

  it("passes through a 404 VIDEO_NOT_FOUND without reshaping", async () => {
    server.use(
      http.patch(`${env.API_URL}/videos/:id`, () =>
        HttpResponse.json(
          { statusCode: 404, error: "VIDEO_NOT_FOUND", message: "Video not found" },
          { status: 404 }
        )
      )
    );

    const res = await PATCH(makeRequest({ title: "x" }), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });

  it("passes through a 400 VALIDATION_ERROR without reshaping", async () => {
    server.use(
      http.patch(`${env.API_URL}/videos/:id`, () =>
        HttpResponse.json(
          { statusCode: 400, error: "VALIDATION_ERROR", message: "Validation failed" },
          { status: 400 }
        )
      )
    );

    const res = await PATCH(makeRequest({ category: "not-a-category" }), {
      params: Promise.resolve({ id: "pub123" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VALIDATION_ERROR" });
  });
});
