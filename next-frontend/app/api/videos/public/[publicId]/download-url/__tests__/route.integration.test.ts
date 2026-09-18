import { describe, it, expect, beforeAll } from "vitest";

import { PUBLIC_VIDEO_NOT_FOUND_TRIGGER } from "@/mocks/handlers/videos";

let GET: (
  req: Request,
  ctx: { params: Promise<{ publicId: string }> }
) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import(
    "@/app/api/videos/public/[publicId]/download-url/route"
  ));
});

describe("GET /api/videos/public/[publicId]/download-url", () => {
  it("forwards to the upstream endpoint and returns the same format", async () => {
    const res = await GET(
      new Request("http://localhost/api/videos/public/pub123/download-url"),
      { params: Promise.resolve({ publicId: "pub123" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.url).toBe("string");
    expect((body.url as string).length).toBeGreaterThan(0);
  });

  it("passes through a 404 VIDEO_NOT_FOUND without reshaping", async () => {
    const res = await GET(
      new Request(
        `http://localhost/api/videos/public/${PUBLIC_VIDEO_NOT_FOUND_TRIGGER}/download-url`
      ),
      { params: Promise.resolve({ publicId: PUBLIC_VIDEO_NOT_FOUND_TRIGGER }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });
});
