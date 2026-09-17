import { describe, it, expect, beforeAll } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { env } from "@/lib/env";

let GET: (req: Request) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/videos/public/route"));
});

describe("GET /api/videos/public", () => {
  it("forwards to the upstream endpoint and returns the same format", async () => {
    const res = await GET(new Request("http://localhost/api/videos/public"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items[0]).toMatchObject({
      public_id: expect.any(String),
      channel: { nickname: expect.any(String), name: expect.any(String) },
    });
    expect(body).toMatchObject({
      total: expect.any(Number),
      page: expect.any(Number),
      limit: expect.any(Number),
    });
  });

  it("forwards category, q, page and limit query params to the upstream request", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get(`${env.API_URL}/videos/public`, ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json(
          { items: [], total: 0, page: 2, limit: 12 },
          { status: 200 }
        );
      })
    );

    await GET(
      new Request(
        "http://localhost/api/videos/public?category=music&q=home&page=2&limit=12"
      )
    );

    expect(capturedUrl?.searchParams.get("category")).toBe("music");
    expect(capturedUrl?.searchParams.get("q")).toBe("home");
    expect(capturedUrl?.searchParams.get("page")).toBe("2");
    expect(capturedUrl?.searchParams.get("limit")).toBe("12");
  });

  it("filters by category via the mocked upstream", async () => {
    const res = await GET(
      new Request("http://localhost/api/videos/public?category=music")
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].category).toBe("music");
  });

  it("passes through a 400 VALIDATION_ERROR without reshaping", async () => {
    server.use(
      http.get(`${env.API_URL}/videos/public`, () =>
        HttpResponse.json(
          { statusCode: 400, error: "VALIDATION_ERROR", message: "Invalid category", code: null },
          { status: 400 }
        )
      )
    );

    const res = await GET(
      new Request("http://localhost/api/videos/public?category=not-real")
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VALIDATION_ERROR" });
  });
});
