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

let GET: (req: Request) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/channels/me/videos/route"));
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

describe("GET /api/channels/me/videos", () => {
  it("forwards query params and the session's access token", async () => {
    let capturedUrl: URL | null = null;
    let capturedAuth: string | null = null;
    server.use(
      http.get(`${env.API_URL}/channels/me/videos`, ({ request }) => {
        capturedUrl = new URL(request.url);
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json({ items: [], page: 2, limit: 5, total: 0 }, { status: 200 });
      })
    );

    const res = await GET(
      new Request(
        "http://localhost/api/channels/me/videos?page=2&limit=5&visibility=public&sort=oldest&search=bread"
      )
    );

    expect(res.status).toBe(200);
    expect(capturedAuth).toBe("Bearer active-at");
    expect(capturedUrl!.searchParams.get("page")).toBe("2");
    expect(capturedUrl!.searchParams.get("limit")).toBe("5");
    expect(capturedUrl!.searchParams.get("visibility")).toBe("public");
    expect(capturedUrl!.searchParams.get("sort")).toBe("oldest");
    expect(capturedUrl!.searchParams.get("search")).toBe("bread");
  });

  it("passes through a 401 without reshaping", async () => {
    server.use(
      http.get(`${env.API_URL}/channels/me/videos`, () =>
        HttpResponse.json(
          { statusCode: 401, error: "UNAUTHORIZED", message: "Unauthorized" },
          { status: 401 }
        )
      )
    );

    const res = await GET(new Request("http://localhost/api/channels/me/videos"));

    expect(res.status).toBe(401);
  });
});
