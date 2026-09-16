import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";
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
let POST: (
  req: Request,
  ctx: { params: Promise<{ publicId: string }> }
) => Promise<Response>;

beforeAll(async () => {
  ({ GET, POST } = await import(
    "@/app/api/videos/public/[publicId]/comments/route"
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

function makeGetRequest(publicId: string, query = "") {
  return new Request(
    `http://localhost/api/videos/public/${publicId}/comments${query}`
  );
}

function makePostRequest(publicId: string, body: Record<string, unknown>) {
  return new Request(`http://localhost/api/videos/public/${publicId}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/videos/public/[publicId]/comments", () => {
  it("returns the upstream items/total unchanged", async () => {
    const res = await GET(makeGetRequest("pub123"), {
      params: Promise.resolve({ publicId: "pub123" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items).toHaveLength(1);
  });

  it("forwards the limit query parameter to the upstream", async () => {
    server.use(
      http.get(`${env.API_URL}/videos/:publicId/comments`, ({ request }) => {
        const limit = new URL(request.url).searchParams.get("limit");
        return HttpResponse.json(
          { items: [], total: limit === "1" ? 42 : 0 },
          { status: 200 }
        );
      })
    );

    const res = await GET(makeGetRequest("pub123", "?limit=1"), {
      params: Promise.resolve({ publicId: "pub123" }),
    });

    const body = await res.json();
    expect(body.total).toBe(42);
  });

  it("passes through a 404 VIDEO_NOT_FOUND without reshaping", async () => {
    const res = await GET(makeGetRequest(PUBLIC_VIDEO_NOT_FOUND_TRIGGER), {
      params: Promise.resolve({ publicId: PUBLIC_VIDEO_NOT_FOUND_TRIGGER }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });

  it("forwards the session's Authorization header when logged in", async () => {
    let receivedAuthHeader: string | null = null;
    server.use(
      http.get(`${env.API_URL}/videos/:publicId/comments`, ({ request }) => {
        receivedAuthHeader = request.headers.get("authorization");
        return HttpResponse.json({ items: [], total: 0 }, { status: 200 });
      })
    );

    await GET(makeGetRequest("pub123"), {
      params: Promise.resolve({ publicId: "pub123" }),
    });

    expect(receivedAuthHeader).toBe("Bearer active-at");
  });

  it("does not forward an Authorization header when anonymous", async () => {
    cookieMap.clear();

    let receivedAuthHeader: string | null | undefined = undefined;
    server.use(
      http.get(`${env.API_URL}/videos/:publicId/comments`, ({ request }) => {
        receivedAuthHeader = request.headers.get("authorization");
        return HttpResponse.json({ items: [], total: 0 }, { status: 200 });
      })
    );

    await GET(makeGetRequest("pub123"), {
      params: Promise.resolve({ publicId: "pub123" }),
    });

    expect(receivedAuthHeader).toBeNull();
  });
});

describe("POST /api/videos/public/[publicId]/comments", () => {
  it("forwards the request body and returns the upstream 201 response unchanged", async () => {
    const res = await POST(makePostRequest("pub123", { body: "Great video!" }), {
      params: Promise.resolve({ publicId: "pub123" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.body).toBe("Great video!");
  });

  it("passes through a 401 UNAUTHORIZED without reshaping", async () => {
    server.use(
      http.post(`${env.API_URL}/videos/:publicId/comments`, () =>
        HttpResponse.json(
          { statusCode: 401, error: "UNAUTHORIZED", message: "Unauthorized" },
          { status: 401 }
        )
      )
    );

    const res = await POST(makePostRequest("pub123", { body: "hi" }), {
      params: Promise.resolve({ publicId: "pub123" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "UNAUTHORIZED" });
  });

  it("passes through a 400 validation error without reshaping", async () => {
    server.use(
      http.post(`${env.API_URL}/videos/:publicId/comments`, () =>
        HttpResponse.json(
          { statusCode: 400, error: "Bad Request", message: ["body should not be empty"] },
          { status: 400 }
        )
      )
    );

    const res = await POST(makePostRequest("pub123", { body: "" }), {
      params: Promise.resolve({ publicId: "pub123" }),
    });

    expect(res.status).toBe(400);
  });

  it("passes through a 404 VIDEO_NOT_FOUND without reshaping", async () => {
    const res = await POST(
      makePostRequest(PUBLIC_VIDEO_NOT_FOUND_TRIGGER, { body: "hi" }),
      { params: Promise.resolve({ publicId: PUBLIC_VIDEO_NOT_FOUND_TRIGGER }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });
});
