import { describe, it, expect, beforeAll } from "vitest";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";

let GET: (
  req: Request,
  ctx: { params: Promise<{ nickname: string }> }
) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/channels/[nickname]/videos/route"));
});

describe("GET /api/channels/[nickname]/videos", () => {
  it("works without a session and forwards page/limit/sort query params", async () => {
    let capturedUrl: URL | null = null;
    server.use(
      http.get(`${env.API_URL}/channels/:nickname/videos`, ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({ items: [], page: 1, limit: 10, total: 0 }, { status: 200 });
      })
    );

    const res = await GET(
      new Request(
        "http://localhost/api/channels/alice/videos?page=1&limit=10&sort=popular"
      ),
      { params: Promise.resolve({ nickname: "alice" }) }
    );

    expect(res.status).toBe(200);
    expect(capturedUrl!.searchParams.get("page")).toBe("1");
    expect(capturedUrl!.searchParams.get("limit")).toBe("10");
    expect(capturedUrl!.searchParams.get("sort")).toBe("popular");
  });

  it("passes through a 404 CHANNEL_NOT_FOUND without reshaping", async () => {
    server.use(
      http.get(`${env.API_URL}/channels/:nickname/videos`, () =>
        HttpResponse.json(
          { statusCode: 404, error: "CHANNEL_NOT_FOUND", message: "Channel not found" },
          { status: 404 }
        )
      )
    );

    const res = await GET(
      new Request("http://localhost/api/channels/no-such-channel/videos"),
      { params: Promise.resolve({ nickname: "no-such-channel" }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "CHANNEL_NOT_FOUND" });
  });
});
