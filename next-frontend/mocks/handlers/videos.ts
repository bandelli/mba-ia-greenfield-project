import { http, HttpResponse } from "msw";

import type { Video, VideoThumbnailResponse } from "@/lib/api/contracts";
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

// Reserved trigger ids (E2E only — shared with Vitest fixture values must not
// collide; these are distinct from any Vitest-used id such as "pub123").
export const VALIDATION_ERROR_TRIGGER_ID = "trigger-validation-error";
export const VIDEO_NOT_READY_TRIGGER_ID = "trigger-video-not-ready";

function errorEnvelope(error: string, message: string) {
  return { statusCode: 400, error, message, code: null };
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
];
