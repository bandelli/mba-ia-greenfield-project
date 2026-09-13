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

let PATCH: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

beforeAll(async () => {
  ({ PATCH } = await import("@/app/api/videos/[id]/thumbnail/route"));
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

function makeMultipartRequest(): Request {
  const formData = new FormData();
  formData.set(
    "thumbnail",
    new Blob(["fake-image-bytes"], { type: "image/png" }),
    "thumbnail.png"
  );
  return new Request("http://localhost/api/videos/pub123/thumbnail", {
    method: "PATCH",
    body: formData,
  });
}

describe("PATCH /api/videos/[id]/thumbnail", () => {
  it("forwards the multipart body unchanged and returns the upstream's 200 response", async () => {
    let receivedFile: File | null = null;
    server.use(
      http.patch(`${env.API_URL}/videos/:id/thumbnail`, async ({ request }) => {
        const forwarded = await request.formData();
        receivedFile = forwarded.get("thumbnail") as File;
        return HttpResponse.json({ id: "video-1", thumbnail_key: "thumbnails/video-1.png" }, { status: 200 });
      })
    );

    const res = await PATCH(makeMultipartRequest(), {
      params: Promise.resolve({ id: "pub123" }),
    });

    expect(res.status).toBe(200);
    expect(receivedFile).not.toBeNull();
    expect(receivedFile!.name).toBe("thumbnail.png");
    expect(receivedFile!.type).toBe("image/png");
    const content = await receivedFile!.text();
    expect(content).toBe("fake-image-bytes");
  });

  it("passes through a 400 THUMBNAIL_INVALID_FILE without reshaping", async () => {
    server.use(
      http.patch(`${env.API_URL}/videos/:id/thumbnail`, () =>
        HttpResponse.json(
          { statusCode: 400, error: "THUMBNAIL_INVALID_FILE", message: "Invalid file" },
          { status: 400 }
        )
      )
    );

    const res = await PATCH(makeMultipartRequest(), {
      params: Promise.resolve({ id: "pub123" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: "THUMBNAIL_INVALID_FILE" });
  });

  it("passes through a 404 VIDEO_NOT_FOUND without reshaping", async () => {
    server.use(
      http.patch(`${env.API_URL}/videos/:id/thumbnail`, () =>
        HttpResponse.json(
          { statusCode: 404, error: "VIDEO_NOT_FOUND", message: "Video not found" },
          { status: 404 }
        )
      )
    );

    const res = await PATCH(makeMultipartRequest(), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });
});
