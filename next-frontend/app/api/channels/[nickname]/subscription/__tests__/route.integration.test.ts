import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import {
  CHANNEL_NOT_FOUND_TRIGGER,
  OWN_CHANNEL_SUBSCRIPTION_TRIGGER,
} from "@/mocks/handlers/channels";
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

let PUT: (
  req: Request,
  ctx: { params: Promise<{ nickname: string }> }
) => Promise<Response>;

beforeAll(async () => {
  ({ PUT } = await import("@/app/api/channels/[nickname]/subscription/route"));
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

function makeRequest(nickname: string, body: Record<string, unknown>) {
  return new Request(`http://localhost/api/channels/${nickname}/subscription`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/channels/[nickname]/subscription", () => {
  it("forwards the request body and returns the upstream response unchanged", async () => {
    const res = await PUT(makeRequest("bob", { subscribed: true }), {
      params: Promise.resolve({ nickname: "bob" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ subscribed: true, subscribersCount: 1 });
  });

  it("passes through a 409 CANNOT_SUBSCRIBE_OWN_CHANNEL without reshaping", async () => {
    const res = await PUT(
      makeRequest(OWN_CHANNEL_SUBSCRIPTION_TRIGGER, { subscribed: true }),
      { params: Promise.resolve({ nickname: OWN_CHANNEL_SUBSCRIPTION_TRIGGER }) }
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toMatchObject({ error: "CANNOT_SUBSCRIBE_OWN_CHANNEL" });
  });

  it("passes through a 404 CHANNEL_NOT_FOUND without reshaping", async () => {
    const res = await PUT(
      makeRequest(CHANNEL_NOT_FOUND_TRIGGER, { subscribed: true }),
      { params: Promise.resolve({ nickname: CHANNEL_NOT_FOUND_TRIGGER }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "CHANNEL_NOT_FOUND" });
  });

  it("passes through a 401 UNAUTHORIZED without reshaping", async () => {
    server.use(
      http.put(`${env.API_URL}/channels/:nickname/subscription`, () =>
        HttpResponse.json(
          { statusCode: 401, error: "UNAUTHORIZED", message: "Unauthorized" },
          { status: 401 }
        )
      )
    );

    const res = await PUT(makeRequest("bob", { subscribed: true }), {
      params: Promise.resolve({ nickname: "bob" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "UNAUTHORIZED" });
  });
});
