// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, it, expect } from "vitest";

import { server } from "@/mocks/server";
import { VideoGridCard } from "../video-grid-card";

describe("VideoGridCard", () => {
  it("renders title, channel name, views, and formatted duration", () => {
    render(
      <VideoGridCard
        publicId="abc123"
        title="Building a video grid"
        thumbnailKey={null}
        durationSeconds={80}
        views={1234}
        publishedAt={new Date(Date.now() - 3600_000).toISOString()}
        channel={{ nickname: "marimartin", name: "Mari Martin" }}
      />
    );
    expect(screen.getByText("Building a video grid")).toBeInTheDocument();
    expect(screen.getByText("Mari Martin")).toBeInTheDocument();
    expect(screen.getByText("1,234 views", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("1:20")).toBeInTheDocument();
  });

  it("links to the watch page for the video's public_id", () => {
    render(
      <VideoGridCard
        publicId="abc123"
        title="Building a video grid"
        thumbnailKey={null}
        durationSeconds={80}
        views={1234}
        publishedAt={null}
        channel={{ nickname: "marimartin", name: "Mari Martin" }}
      />
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/watch/abc123");
  });

  it("renders channel initials in the avatar fallback", () => {
    render(
      <VideoGridCard
        publicId="abc123"
        title="t"
        thumbnailKey={null}
        durationSeconds={null}
        views={0}
        publishedAt={null}
        channel={{ nickname: "marimartin", name: "Mari Martin" }}
      />
    );
    expect(screen.getByText("MM")).toBeInTheDocument();
  });

  it("does not render a duration badge when durationSeconds is null", () => {
    render(
      <VideoGridCard
        publicId="abc123"
        title="t"
        thumbnailKey={null}
        durationSeconds={null}
        views={0}
        publishedAt={null}
        channel={{ nickname: "marimartin", name: "Mari Martin" }}
      />
    );
    expect(screen.queryByText(/^\d+:\d{2}$/)).not.toBeInTheDocument();
  });

  it("renders the resolved thumbnail image when thumbnailKey is present", async () => {
    server.use(
      http.get("/api/videos/public/abc123/thumbnail-url", () =>
        HttpResponse.json({ url: "https://storage.example.com/thumb.png" })
      )
    );

    render(
      <VideoGridCard
        publicId="abc123"
        title="Building a video grid"
        thumbnailKey="thumbnails/abc123.png"
        durationSeconds={80}
        views={1234}
        publishedAt={null}
        channel={{ nickname: "marimartin", name: "Mari Martin" }}
      />
    );

    await waitFor(() => expect(screen.getByRole("img")).toBeInTheDocument());
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://storage.example.com/thumb.png"
    );
  });

  it("renders no image when thumbnailKey is null (placeholder background only)", () => {
    render(
      <VideoGridCard
        publicId="abc123"
        title="Building a video grid"
        thumbnailKey={null}
        durationSeconds={80}
        views={1234}
        publishedAt={null}
        channel={{ nickname: "marimartin", name: "Mari Martin" }}
      />
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
