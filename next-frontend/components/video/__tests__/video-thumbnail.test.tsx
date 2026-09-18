// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/mocks/server";
import { VideoThumbnail } from "../video-thumbnail";

describe("VideoThumbnail", () => {
  it("renders nothing when thumbnailKey is null (no fetch)", () => {
    render(
      <VideoThumbnail publicId="pub123" thumbnailKey={null} alt="A video" />
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("resolves and renders the presigned thumbnail via the public BFF route", async () => {
    server.use(
      http.get("/api/videos/public/pub123/thumbnail-url", () =>
        HttpResponse.json({ url: "https://storage.example.com/thumb.png" })
      )
    );

    render(
      <VideoThumbnail
        publicId="pub123"
        thumbnailKey="thumbnails/pub123.png"
        alt="A video"
      />
    );

    await waitFor(() => expect(screen.getByRole("img")).toBeInTheDocument());
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://storage.example.com/thumb.png"
    );
  });

  it("resolves via the owner BFF route when scope is 'owner'", async () => {
    server.use(
      http.get("/api/videos/pub456/thumbnail-url", () =>
        HttpResponse.json({ url: "https://storage.example.com/owner-thumb.png" })
      )
    );

    render(
      <VideoThumbnail
        publicId="pub456"
        thumbnailKey="thumbnails/pub456.png"
        alt="My video"
        scope="owner"
      />
    );

    await waitFor(() => expect(screen.getByRole("img")).toBeInTheDocument());
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://storage.example.com/owner-thumb.png"
    );
  });

  it("falls back to rendering nothing when the BFF route 404s (no thumbnail)", async () => {
    let resolved = false;
    server.use(
      http.get("/api/videos/public/pub789/thumbnail-url", () => {
        resolved = true;
        return HttpResponse.json(
          { statusCode: 404, error: "VIDEO_THUMBNAIL_NOT_FOUND", message: "x" },
          { status: 404 }
        );
      })
    );

    render(
      <VideoThumbnail
        publicId="pub789"
        thumbnailKey="thumbnails/pub789.png"
        alt="A video"
      />
    );

    // Wait for the 404 response to actually land, then confirm it never
    // rendered an image — a `waitFor` asserting non-presence alone would
    // pass trivially before the fetch even resolves.
    await waitFor(() => expect(resolved).toBe(true));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
