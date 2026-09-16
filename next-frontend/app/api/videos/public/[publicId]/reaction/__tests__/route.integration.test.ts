import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";
import { REACTION_NOT_FOUND_TRIGGER } from "@/mocks/handlers/reactions";

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

let PUT: (
  req: Request,
  ctx: { params: Promise<{ publicId: string }> }
) => Promise<Response>;

beforeAll(async () => {
  ({ PUT } = await import("@/app/api/videos/public/[publicId]/reaction/route"));
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

function makeRequest(publicId: string, body: Record<string, unknown>) {
  return new Request(`http://localhost/api/videos/public/${publicId}/reaction`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/videos/public/[publicId]/reaction", () => {
  it("forwards the request body and returns the upstream response unchanged", async () => {
    const res = await PUT(makeRequest("pub123", { type: "like" }), {
      params: Promise.resolve({ publicId: "pub123" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ type: "like", likesCount: 1, dislikesCount: 0 });
  });

  it("forwards a null type to clear the reaction", async () => {
    const res = await PUT(makeRequest("pub123", { type: null }), {
      params: Promise.resolve({ publicId: "pub123" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ type: null, likesCount: 0, dislikesCount: 0 });
  });

  it("passes through a 404 VIDEO_NOT_FOUND without reshaping", async () => {
    const res = await PUT(makeRequest(REACTION_NOT_FOUND_TRIGGER, { type: "like" }), {
      params: Promise.resolve({ publicId: REACTION_NOT_FOUND_TRIGGER }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });

  it("passes through a 401 UNAUTHORIZED without reshaping", async () => {
    server.use(
      http.put(`${env.API_URL}/videos/:publicId/reaction`, () =>
        HttpResponse.json(
          { statusCode: 401, error: "UNAUTHORIZED", message: "Unauthorized" },
          { status: 401 }
        )
      )
    );

    const res = await PUT(makeRequest("pub123", { type: "like" }), {
      params: Promise.resolve({ publicId: "pub123" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "UNAUTHORIZED" });
  });

  it("passes through a 400 validation error without reshaping", async () => {
    server.use(
      http.put(`${env.API_URL}/videos/:publicId/reaction`, () =>
        HttpResponse.json(
          { statusCode: 400, error: "Bad Request", message: ["type must be a valid enum value"] },
          { status: 400 }
        )
      )
    );

    const res = await PUT(makeRequest("pub123", { type: "invalid" }), {
      params: Promise.resolve({ publicId: "pub123" }),
    });

    expect(res.status).toBe(400);
  });
});
