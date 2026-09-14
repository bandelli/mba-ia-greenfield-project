import { http, HttpResponse } from "msw";

import type {
  PublicVideoDetail,
  SuggestedVideosResponse,
  Video,
  VideoDownloadUrlResponse,
  VideoStreamUrlResponse,
  VideoThumbnailResponse,
} from "@/lib/api/contracts";
import { env } from "@/lib/env";

export const baseVideo: Video = {
  id: "video-1",
  public_id: "pub123",
  title: "Fixture title",
  description: "Fixture description",
  category: "music",
  visibility: "public",
  thumbnail_key: "thumbnails/video-1.png",
  status: "ready",
  published_at: null,
  updated_at: "2026-09-12T00:00:00.000Z",
};

export const basePublicVideo: PublicVideoDetail = {
  id: "video-1",
  public_id: "pub123",
  title: "Fixture title",
  description: "Fixture description",
  category: "music",
  visibility: "public",
  duration_seconds: 212,
  thumbnail_key: "thumbnails/video-1.png",
  views: 1234,
  published_at: "2026-09-12T00:00:00.000Z",
  channel: { nickname: "alice", name: "Alice" },
};

const suggestedVideoFixtures: NonNullable<SuggestedVideosResponse["items"]> = [
  {
    id: "video-2",
    public_id: "pub456",
    title: "Another Great Video",
    thumbnail_key: "thumbnails/video-2.png",
    duration_seconds: 340,
    views: 5678,
    published_at: "2026-09-10T00:00:00.000Z",
    channel: { nickname: "bob", name: "Bob" },
  },
];

// Reserved trigger ids (E2E only — shared with Vitest fixture values must not
// collide; these are distinct from any Vitest-used id such as "pub123").
export const VALIDATION_ERROR_TRIGGER_ID = "trigger-validation-error";
export const VIDEO_NOT_READY_TRIGGER_ID = "trigger-video-not-ready";

// Reserved trigger (E2E + Vitest) — a `:publicId` path value that always
// yields 404 VIDEO_NOT_FOUND on every public video endpoint (metadata,
// stream-url, download-url, suggested).
export const PUBLIC_VIDEO_NOT_FOUND_TRIGGER = "trigger-public-video-not-found";

// Reserved trigger (E2E only) — a `:publicId` path value that returns a
// description long enough to be clamped by `description-card.tsx`'s
// `line-clamp-3`, for the "Show more" expand E2E scenario.
export const LONG_DESCRIPTION_TRIGGER = "trigger-long-description";
const LONG_DESCRIPTION =
  "This comprehensive tutorial covers everything from setting up the backend API to creating a responsive frontend UI. " +
  "Topics covered include project setup, authentication, database integration, state management, and deployment strategies. " +
  "By the end of this course you will have built and shipped a complete production-ready application from scratch.";

// Reserved trigger (E2E only) — a `:publicId` path value whose stream-url
// resolves to a real same-origin static asset (a tiny generated fixture MP4
// under `public/test-fixtures/`) instead of the normal fake presigned URL,
// so the player-control E2E scenarios (play/pause/seek/volume) exercise a
// genuinely loadable <video> element without a real network dependency.
export const PLAYABLE_STREAM_TRIGGER = "trigger-playable-stream";

function errorEnvelope(error: string, message: string) {
  return { statusCode: 400, error, message, code: null };
}

function publicVideoNotFoundEnvelope() {
  return { statusCode: 404, error: "VIDEO_NOT_FOUND", message: "Video not found", code: null };
}

export const handlers = [
  // GET /videos/:id
  http.get(`${env.API_URL}/videos/:id`, ({ params }) => {
    return HttpResponse.json<Video>(
      { ...baseVideo, public_id: params.id as string },
      { status: 200 }
    );
  }),

  // PATCH /videos/:id
  http.patch(`${env.API_URL}/videos/:id`, async ({ request, params }) => {
    if (params.id === VALIDATION_ERROR_TRIGGER_ID) {
      return HttpResponse.json(
        errorEnvelope("VALIDATION_ERROR", "Validation failed"),
        { status: 400 }
      );
    }
    const body = (await request.json()) as Partial<Video>;
    return HttpResponse.json<Video>(
      { ...baseVideo, public_id: params.id as string, ...body },
      { status: 200 }
    );
  }),

  // POST /videos/:id/publish
  http.post(`${env.API_URL}/videos/:id/publish`, ({ params }) => {
    if (params.id === VIDEO_NOT_READY_TRIGGER_ID) {
      return HttpResponse.json(
        errorEnvelope("VIDEO_NOT_READY", "Video is not ready"),
        { status: 400 }
      );
    }
    return HttpResponse.json<Video>(
      {
        ...baseVideo,
        public_id: params.id as string,
        published_at: "2026-09-12T00:00:00.000Z",
      },
      { status: 200 }
    );
  }),

  // PATCH /videos/:id/thumbnail
  http.patch(`${env.API_URL}/videos/:id/thumbnail`, () => {
    return HttpResponse.json<VideoThumbnailResponse>(
      { id: "video-1", thumbnail_key: "thumbnails/video-1.png" },
      { status: 200 }
    );
  }),

  // GET /videos/public/:publicId
  http.get(`${env.API_URL}/videos/public/:publicId`, ({ params }) => {
    if (params.publicId === PUBLIC_VIDEO_NOT_FOUND_TRIGGER) {
      return HttpResponse.json(publicVideoNotFoundEnvelope(), { status: 404 });
    }
    return HttpResponse.json<PublicVideoDetail>(
      {
        ...basePublicVideo,
        public_id: params.publicId as string,
        description:
          params.publicId === LONG_DESCRIPTION_TRIGGER
            ? LONG_DESCRIPTION
            : basePublicVideo.description,
      },
      { status: 200 }
    );
  }),

  // GET /videos/public/:publicId/stream-url
  http.get(`${env.API_URL}/videos/public/:publicId/stream-url`, ({ params }) => {
    if (params.publicId === PUBLIC_VIDEO_NOT_FOUND_TRIGGER) {
      return HttpResponse.json(publicVideoNotFoundEnvelope(), { status: 404 });
    }
    return HttpResponse.json<VideoStreamUrlResponse>(
      {
        url:
          params.publicId === PLAYABLE_STREAM_TRIGGER
            ? "/test-fixtures/sample-video.mp4"
            : "https://storage.example.com/stream-presigned-url",
      },
      { status: 200 }
    );
  }),

  // GET /videos/public/:publicId/download-url
  http.get(`${env.API_URL}/videos/public/:publicId/download-url`, ({ params }) => {
    if (params.publicId === PUBLIC_VIDEO_NOT_FOUND_TRIGGER) {
      return HttpResponse.json(publicVideoNotFoundEnvelope(), { status: 404 });
    }
    return HttpResponse.json<VideoDownloadUrlResponse>(
      { url: "https://storage.example.com/download-presigned-url" },
      { status: 200 }
    );
  }),

  // GET /videos/public/:publicId/suggested
  http.get(`${env.API_URL}/videos/public/:publicId/suggested`, ({ params }) => {
    if (params.publicId === PUBLIC_VIDEO_NOT_FOUND_TRIGGER) {
      return HttpResponse.json(publicVideoNotFoundEnvelope(), { status: 404 });
    }
    return HttpResponse.json<SuggestedVideosResponse>(
      { items: suggestedVideoFixtures },
      { status: 200 }
    );
  }),
];
