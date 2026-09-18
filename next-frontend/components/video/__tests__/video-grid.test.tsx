// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";
import { VideoGrid } from "../video-grid";
import type { VideoGridCardProps } from "../video-grid-card";

function makeItem(publicId: string): VideoGridCardProps {
  return {
    publicId,
    title: `Video ${publicId}`,
    thumbnailKey: null,
    durationSeconds: 90,
    views: 100,
    publishedAt: null,
    channel: { nickname: "chan", name: "Channel" },
  };
}

const { observe, disconnect } = vi.hoisted(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}));

beforeEach(() => {
  observe.mockClear();
  disconnect.mockClear();
  class MockIntersectionObserver {
    constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
      (globalThis as unknown as { __ioCallback: typeof cb }).__ioCallback = cb;
    }
    observe = observe;
    disconnect = disconnect;
    unobserve = vi.fn();
  }
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

function fireIntersection() {
  const cb = (globalThis as unknown as { __ioCallback?: (e: { isIntersecting: boolean }[]) => void })
    .__ioCallback;
  cb?.([{ isIntersecting: true }]);
}

describe("VideoGrid", () => {
  it("renders the initial items", () => {
    render(
      <VideoGrid
        initialItems={[makeItem("a"), makeItem("b")]}
        initialPage={1}
        limit={2}
        total={2}
      />
    );
    expect(screen.getByText("Video a")).toBeInTheDocument();
    expect(screen.getByText("Video b")).toBeInTheDocument();
  });

  it("renders an empty state when there are no items", () => {
    render(<VideoGrid initialItems={[]} initialPage={1} limit={24} total={0} />);
    expect(screen.getByText("No videos found.")).toBeInTheDocument();
  });

  it("does not render the sentinel/loader when every item is already loaded", () => {
    render(
      <VideoGrid initialItems={[makeItem("a")]} initialPage={1} limit={24} total={1} />
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("fetches the next page when the sentinel intersects and appends results without duplicating", async () => {
    server.use(
      // The BFF is a pass-through of the backend's snake_case wire shape
      // (home-search-launch §SI-07.3 — no reshape at the BFF tier), so this
      // fixture uses the real wire field names to exercise VideoGrid's own
      // snake_case → VideoGridCardProps mapping in loadNextPage.
      http.get("/api/videos/public", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("page")).toBe("2");
        return HttpResponse.json({
          items: [
            {
              public_id: "c",
              title: "Video c",
              thumbnail_key: null,
              duration_seconds: 90,
              views: 100,
              published_at: null,
              channel: { nickname: "chan", name: "Channel" },
            },
          ],
          total: 3,
          page: 2,
          limit: 2,
        });
      })
    );

    render(
      <VideoGrid
        initialItems={[makeItem("a"), makeItem("b")]}
        initialPage={1}
        limit={2}
        total={3}
      />
    );

    fireIntersection();

    await waitFor(() => expect(screen.getByText("Video c")).toBeInTheDocument());
    expect(screen.getByText("Video a")).toBeInTheDocument();
    expect(screen.getByText("Video b")).toBeInTheDocument();
    expect(screen.getAllByText(/^Video /)).toHaveLength(3);
  });

  it("shows a retry affordance when the next-page fetch fails", async () => {
    server.use(http.get("/api/videos/public", () => HttpResponse.json({}, { status: 500 })));

    render(
      <VideoGrid initialItems={[makeItem("a")]} initialPage={1} limit={1} total={2} />
    );

    fireIntersection();

    await waitFor(() =>
      expect(screen.getByText(/Failed to load more videos/)).toBeInTheDocument()
    );
  });
});
