import { describe, it, expect, beforeAll } from "vitest";

import { PUBLIC_VIDEO_NOT_FOUND_TRIGGER } from "@/mocks/handlers/videos";

let GET: (
  req: Request,
  ctx: { params: Promise<{ publicId: string }> }
) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/videos/public/[publicId]/route"));
});

describe("GET /api/videos/public/[publicId]", () => {
  it("forwards to the upstream endpoint and returns the same format", async () => {
    const res = await GET(
      new Request("http://localhost/api/videos/public/pub123"),
      { params: Promise.resolve({ publicId: "pub123" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.public_id).toBe("pub123");
    expect(body).toMatchObject({
      title: expect.any(String),
      views: expect.any(Number),
      channel: { nickname: expect.any(String), name: expect.any(String) },
    });
  });

  it("passes through a 404 VIDEO_NOT_FOUND without reshaping", async () => {
    const res = await GET(
      new Request(
        `http://localhost/api/videos/public/${PUBLIC_VIDEO_NOT_FOUND_TRIGGER}`
      ),
      { params: Promise.resolve({ publicId: PUBLIC_VIDEO_NOT_FOUND_TRIGGER }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });
});
