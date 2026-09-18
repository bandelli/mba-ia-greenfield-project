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

let GET: (
  req: Request,
  ctx: { params: Promise<{ nickname: string }> }
) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/channels/[nickname]/route"));
});

beforeEach(() => {
  cookieMap.clear();
});

describe("GET /api/channels/[nickname]", () => {
  it("works without a session (public route) and returns public channel info", async () => {
    const res = await GET(new Request("http://localhost/api/channels/alice"), {
      params: Promise.resolve({ nickname: "alice" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nickname).toBe("alice");
    expect(body.user_id).toBeUndefined();
  });

  it("passes through a 404 CHANNEL_NOT_FOUND without reshaping", async () => {
    server.use(
      http.get(`${env.API_URL}/channels/:nickname`, () =>
        HttpResponse.json(
          { statusCode: 404, error: "CHANNEL_NOT_FOUND", message: "Channel not found" },
          { status: 404 }
        )
      )
    );

    const res = await GET(
      new Request("http://localhost/api/channels/no-such-channel"),
      { params: Promise.resolve({ nickname: "no-such-channel" }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "CHANNEL_NOT_FOUND" });
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
      http.get(`${env.API_URL}/channels/:nickname`, ({ request }) => {
        receivedAuthHeader = request.headers.get("authorization");
        return HttpResponse.json(
          { nickname: "alice", isSubscribed: true },
          { status: 200 }
        );
      })
    );

    await GET(new Request("http://localhost/api/channels/alice"), {
      params: Promise.resolve({ nickname: "alice" }),
    });

    expect(receivedAuthHeader).toBe("Bearer active-at");
  });

  it("does not forward an Authorization header when anonymous", async () => {
    let receivedAuthHeader: string | null | undefined = undefined;
    server.use(
      http.get(`${env.API_URL}/channels/:nickname`, ({ request }) => {
        receivedAuthHeader = request.headers.get("authorization");
        return HttpResponse.json(
          { nickname: "alice", isSubscribed: false },
          { status: 200 }
        );
      })
    );

    await GET(new Request("http://localhost/api/channels/alice"), {
      params: Promise.resolve({ nickname: "alice" }),
    });

    expect(receivedAuthHeader).toBeNull();
  });
});
