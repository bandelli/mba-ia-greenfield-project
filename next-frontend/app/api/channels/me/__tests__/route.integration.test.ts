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

let GET: () => Promise<Response>;
let PATCH: (req: Request) => Promise<Response>;

beforeAll(async () => {
  ({ GET, PATCH } = await import("@/app/api/channels/me/route"));
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

function makePatchRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/channels/me", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/channels/me", () => {
  it("forwards the session's access token and returns the upstream channel", async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get(`${env.API_URL}/channels/me`, ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json({ nickname: "alice" }, { status: 200 });
      })
    );

    const res = await GET();

    expect(res.status).toBe(200);
    expect(capturedAuth).toBe("Bearer active-at");
    const body = await res.json();
    expect(body.nickname).toBe("alice");
  });

  it("passes through a 401 without reshaping", async () => {
    server.use(
      http.get(`${env.API_URL}/channels/me`, () =>
        HttpResponse.json(
          { statusCode: 401, error: "UNAUTHORIZED", message: "Unauthorized" },
          { status: 401 }
        )
      )
    );

    const res = await GET();

    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/channels/me", () => {
  it("forwards the body and returns the upstream's 200 response", async () => {
    const res = await PATCH(makePatchRequest({ nickname: "novo_nick_livre" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nickname).toBe("novo_nick_livre");
  });

  it("passes through a 409 CHANNEL_NICKNAME_TAKEN without reshaping", async () => {
    server.use(
      http.patch(`${env.API_URL}/channels/me`, () =>
        HttpResponse.json(
          {
            statusCode: 409,
            error: "CHANNEL_NICKNAME_TAKEN",
            message: "Nickname already in use",
          },
          { status: 409 }
        )
      )
    );

    const res = await PATCH(makePatchRequest({ nickname: "taken" }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toMatchObject({ error: "CHANNEL_NICKNAME_TAKEN" });
  });
});
