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

let POST: (req: Request) => Promise<Response>;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/videos/uploads/route"));
});

const { setSession } = await import("@/lib/auth/session");

function makeCreateRequest(): Request {
  return new Request("http://localhost/api/videos/uploads", {
    method: "POST",
    headers: {
      "Tus-Resumable": "1.0.0",
      "Upload-Length": "1024",
      "Upload-Metadata": "filetype dmlkZW8vbXA0,filename dmlkZW8ubXA0",
    },
  });
}

describe("POST /api/videos/uploads", () => {
  it("returns 401 without ever calling upstream when there is no session", async () => {
    cookieMap.clear();
    let upstreamCalled = false;
    server.use(
      http.post(`${env.API_URL}/videos/uploads`, () => {
        upstreamCalled = true;
        return new HttpResponse(null, { status: 201 });
      })
    );

    const res = await POST(makeCreateRequest());

    expect(res.status).toBe(401);
    expect(upstreamCalled).toBe(false);
    const body = await res.json();
    expect(body.error).toBe("UPLOAD_UNAUTHENTICATED");
  });

  describe("with an active session", () => {
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

    it("forwards tus headers and injects the session's Authorization header", async () => {
      let capturedAuth: string | null = null;
      let capturedLength: string | null = null;
      let capturedMetadata: string | null = null;
      server.use(
        http.post(`${env.API_URL}/videos/uploads`, ({ request }) => {
          capturedAuth = request.headers.get("Authorization");
          capturedLength = request.headers.get("Upload-Length");
          capturedMetadata = request.headers.get("Upload-Metadata");
          return new HttpResponse(null, {
            status: 201,
            headers: {
              "Tus-Resumable": "1.0.0",
              Location: "/videos/uploads/abc123",
            },
          });
        })
      );

      const res = await POST(makeCreateRequest());

      expect(res.status).toBe(201);
      expect(capturedAuth).toBe("Bearer active-at");
      expect(capturedLength).toBe("1024");
      expect(capturedMetadata).toContain("filetype");
    });

    it("rewrites the upstream Location header to the BFF's own path", async () => {
      server.use(
        http.post(`${env.API_URL}/videos/uploads`, () =>
          new HttpResponse(null, {
            status: 201,
            headers: {
              "Tus-Resumable": "1.0.0",
              Location: "/videos/uploads/abc123",
            },
          })
        )
      );

      const res = await POST(makeCreateRequest());

      expect(res.headers.get("Location")).toBe(
        "/api/videos/uploads/abc123"
      );
    });

    it("passes through an upstream error verbatim", async () => {
      server.use(
        http.post(`${env.API_URL}/videos/uploads`, () =>
          HttpResponse.json(
            {
              statusCode: 400,
              error: "UPLOAD_INVALID_FILE_TYPE",
              message: "Only video files are accepted.",
            },
            { status: 400 }
          )
        )
      );

      const res = await POST(makeCreateRequest());

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toMatchObject({ error: "UPLOAD_INVALID_FILE_TYPE" });
    });
  });
});
