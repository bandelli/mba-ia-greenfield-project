import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
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

type RouteHandler = (
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) => Promise<Response>;

let HEAD: RouteHandler;
let PATCH: RouteHandler;
let DELETE: RouteHandler;

beforeAll(async () => {
  ({ HEAD, PATCH, DELETE } = await import("@/app/api/videos/uploads/[id]/route"));
});

const { setSession } = await import("@/lib/auth/session");

const ctx = { params: Promise.resolve({ id: "abc123" }) };

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

describe("HEAD /api/videos/uploads/[id]", () => {
  it("forwards the Upload-Offset header back to the caller", async () => {
    server.use(
      http.head(`${env.API_URL}/videos/uploads/:id`, () =>
        new HttpResponse(null, {
          status: 200,
          headers: { "Tus-Resumable": "1.0.0", "Upload-Offset": "512" },
        })
      )
    );

    const res = await HEAD(
      new Request("http://localhost/api/videos/uploads/abc123", {
        method: "HEAD",
        headers: { "Tus-Resumable": "1.0.0" },
      }),
      ctx
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Upload-Offset")).toBe("512");
  });
});

describe("PATCH /api/videos/uploads/[id]", () => {
  it("streams the chunk body through to upstream", async () => {
    let receivedBody: string | null = null;
    server.use(
      http.patch(`${env.API_URL}/videos/uploads/:id`, async ({ request }) => {
        receivedBody = await request.text();
        return new HttpResponse(null, {
          status: 204,
          headers: { "Tus-Resumable": "1.0.0", "Upload-Offset": "4" },
        });
      })
    );

    const res = await PATCH(
      new Request("http://localhost/api/videos/uploads/abc123", {
        method: "PATCH",
        headers: {
          "Tus-Resumable": "1.0.0",
          "Upload-Offset": "0",
          "Content-Type": "application/offset+octet-stream",
        },
        body: "data",
      }),
      ctx
    );

    expect(res.status).toBe(204);
    expect(receivedBody).toBe("data");
    expect(res.headers.get("Upload-Offset")).toBe("4");
  });

  it("forwards X-Video-Public-Id on the finishing chunk", async () => {
    server.use(
      http.patch(`${env.API_URL}/videos/uploads/:id`, () =>
        new HttpResponse(null, {
          status: 204,
          headers: {
            "Tus-Resumable": "1.0.0",
            "Upload-Offset": "1024",
            "X-Video-Public-Id": "pub999",
          },
        })
      )
    );

    const res = await PATCH(
      new Request("http://localhost/api/videos/uploads/abc123", {
        method: "PATCH",
        headers: {
          "Tus-Resumable": "1.0.0",
          "Upload-Offset": "0",
          "Content-Type": "application/offset+octet-stream",
        },
        body: "data",
      }),
      ctx
    );

    expect(res.headers.get("X-Video-Public-Id")).toBe("pub999");
  });
});

describe("DELETE /api/videos/uploads/[id]", () => {
  it("returns the upstream's 204", async () => {
    server.use(
      http.delete(`${env.API_URL}/videos/uploads/:id`, () =>
        new HttpResponse(null, {
          status: 204,
          headers: { "Tus-Resumable": "1.0.0" },
        })
      )
    );

    const res = await DELETE(
      new Request("http://localhost/api/videos/uploads/abc123", {
        method: "DELETE",
        headers: { "Tus-Resumable": "1.0.0" },
      }),
      ctx
    );

    expect(res.status).toBe(204);
  });
});
