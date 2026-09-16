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

let GET: (req: Request) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/subscriptions/route"));
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

function makeRequest(query = "") {
  return new Request(`http://localhost/api/subscriptions${query}`);
}

describe("GET /api/subscriptions", () => {
  it("returns the upstream items/total unchanged", async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(22);
    expect(body.items).toHaveLength(22);
  });

  it("forwards the limit query parameter to the upstream", async () => {
    const res = await GET(makeRequest("?limit=1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(22);
  });

  it("forwards the offset query parameter to the upstream", async () => {
    const res = await GET(makeRequest("?limit=20&offset=20"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(body.total).toBe(22);
  });

  it("passes through a 401 UNAUTHORIZED without reshaping", async () => {
    server.use(
      http.get(`${env.API_URL}/users/me/subscriptions`, () =>
        HttpResponse.json(
          { statusCode: 401, error: "UNAUTHORIZED", message: "Unauthorized" },
          { status: 401 }
        )
      )
    );

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "UNAUTHORIZED" });
  });
});
