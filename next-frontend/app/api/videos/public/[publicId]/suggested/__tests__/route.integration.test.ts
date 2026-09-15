import { describe, it, expect, beforeAll } from "vitest";
import { http, HttpResponse } from "msw";

import { PUBLIC_VIDEO_NOT_FOUND_TRIGGER } from "@/mocks/handlers/videos";
import { server } from "@/mocks/server";
import { env } from "@/lib/env";

let GET: (
  req: Request,
  ctx: { params: Promise<{ publicId: string }> }
) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import(
    "@/app/api/videos/public/[publicId]/suggested/route"
  ));
});

describe("GET /api/videos/public/[publicId]/suggested", () => {
  it("forwards to the upstream endpoint and returns the same format", async () => {
    const res = await GET(
      new Request("http://localhost/api/videos/public/pub123/suggested"),
      { params: Promise.resolve({ publicId: "pub123" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items[0]).toMatchObject({
      public_id: expect.any(String),
      channel: { nickname: expect.any(String), name: expect.any(String) },
    });
  });

  it("forwards the limit query param to the upstream request", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get(
        `${env.API_URL}/videos/public/:publicId/suggested`,
        ({ request }) => {
          capturedUrl = new URL(request.url);
          return HttpResponse.json({ items: [] }, { status: 200 });
        }
      )
    );

    await GET(
      new Request(
        "http://localhost/api/videos/public/pub123/suggested?limit=5"
      ),
      { params: Promise.resolve({ publicId: "pub123" }) }
    );

    expect(capturedUrl?.searchParams.get("limit")).toBe("5");
  });

  it("passes through a 404 VIDEO_NOT_FOUND without reshaping", async () => {
    const res = await GET(
      new Request(
        `http://localhost/api/videos/public/${PUBLIC_VIDEO_NOT_FOUND_TRIGGER}/suggested`
      ),
      { params: Promise.resolve({ publicId: PUBLIC_VIDEO_NOT_FOUND_TRIGGER }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });
});
