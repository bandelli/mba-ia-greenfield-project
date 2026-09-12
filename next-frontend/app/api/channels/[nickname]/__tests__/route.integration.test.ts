import { describe, it, expect, beforeAll } from "vitest";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";

let GET: (
  req: Request,
  ctx: { params: Promise<{ nickname: string }> }
) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/channels/[nickname]/route"));
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
});
