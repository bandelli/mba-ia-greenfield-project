import { http, HttpResponse } from "msw";

import type {
  CreateCommentResponse,
  CreateReplyResponse,
  FindCommentsResponse,
  HomeFeedResponse,
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
  likesCount: 24_000,
  dislikesCount: 120,
  currentUserReaction: null,
  published_at: "2026-09-12T00:00:00.000Z",
  channel: { nickname: "alice", name: "Alice", subscribersCount: 4_200 },
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

const homeFeedFixtures: NonNullable<HomeFeedResponse["items"]> = [
  {
    public_id: "pub-home-1",
    title: "Building a home page",
    category: "technology",
    thumbnail_key: "thumbnails/video-home-1.png",
    duration_seconds: 305,
    views: 4200,
    published_at: "2026-09-11T00:00:00.000Z",
    channel: { nickname: "alice", name: "Alice" },
  },
  {
    public_id: "pub-home-2",
    title: "Relaxing music mix",
    category: "music",
    thumbnail_key: "thumbnails/video-home-2.png",
    duration_seconds: 620,
    views: 9800,
    published_at: "2026-09-10T00:00:00.000Z",
    channel: { nickname: "bob", name: "Bob" },
  },
  // 24 filler items (category "entertainment" — never collides with the
  // category=music/technology fixtures above or the assertions that count on
  // them) so the unfiltered `/videos/public` listing has 26 items total,
  // exceeding the home page's DEFAULT_LIMIT of 24 — this gives the E2E
  // infinite-scroll scenario a genuine, naturally-occurring second page (2
  // items) with no reserved trigger needed, mirroring the same strategy
  // tests/subscriptions.e2e-spec.ts already uses for its own pagination test.
  ...Array.from({ length: 24 }, (_, i) => ({
    public_id: `pub-home-filler-${i + 1}`,
    title: `Bonus video ${i + 1}`,
    category: "entertainment",
    thumbnail_key: `thumbnails/video-home-filler-${i + 1}.png`,
    duration_seconds: 200,
    views: 100 * (i + 1),
    published_at: "2026-09-01T00:00:00.000Z",
    channel: { nickname: "alice", name: "Alice" },
  })),
];

const baseComment: NonNullable<FindCommentsResponse["items"]>[number] = {
  id: "comment-1",
  body: "Fixture comment",
  author: { id: "author-1", nickname: "alice" },
  createdAt: "2026-09-12T00:00:00.000Z",
  likesCount: 0,
  dislikesCount: 0,
  currentUserReaction: null,
  replies: [],
};

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

// Reserved trigger (E2E + Vitest) — a `:commentId` path value that always
// yields 404 COMMENT_NOT_FOUND on the create-reply endpoint.
export const COMMENT_NOT_FOUND_TRIGGER = "trigger-comment-not-found";

// Reserved trigger (E2E + Vitest) — a `:commentId` path value that always
// yields 400 REPLY_DEPTH_EXCEEDED on the create-reply endpoint (simulates
// replying to a comment that is itself already a reply).
export const REPLY_DEPTH_EXCEEDED_TRIGGER = "trigger-reply-depth-exceeded";

// Reserved trigger PREFIX (E2E only) — any `:publicId` starting with this
// prefix gets its own in-memory comment list (seeded with one copy of
// `baseComment`) that POST-comment/POST-reply calls mutate for the lifetime
// of the dev-server process. This lets an E2E scenario do a genuine
// write-then-`router.refresh()` round trip and see its own write reflected.
// Every E2E test that needs this uses its OWN uniquely-suffixed publicId
// (e.g. "trigger-stateful-comments-post-1") to stay isolated under
// Playwright's `fullyParallel: true` config — concurrent tests never share
// a key. Every publicId NOT under this prefix keeps the static
// single-fixture behavior the BFF route integration tests already rely on.
export const STATEFUL_COMMENTS_PREFIX = "trigger-stateful-comments-";
const statefulCommentsByPublicId = new Map<
  string,
  NonNullable<FindCommentsResponse["items"]>
>();

function getStatefulComments(
  publicId: string
): NonNullable<FindCommentsResponse["items"]> {
  if (!statefulCommentsByPublicId.has(publicId)) {
    statefulCommentsByPublicId.set(publicId, [{ ...baseComment, replies: [] }]);
  }
  return statefulCommentsByPublicId.get(publicId)!;
}

function errorEnvelope(error: string, message: string) {
  return { statusCode: 400, error, message, code: null };
}

function publicVideoNotFoundEnvelope() {
  return { statusCode: 404, error: "VIDEO_NOT_FOUND", message: "Video not found", code: null };
}

function commentNotFoundEnvelope() {
  return { statusCode: 404, error: "COMMENT_NOT_FOUND", message: "Comment not found", code: null };
}

export const handlers = [
  // GET /videos/public
  // NOTE: this MUST be registered before `GET /videos/:id` below — MSW
  // matches handlers in array order, and `:id` matches any single path
  // segment including the literal "public", so registering this after
  // `/videos/:id` would silently shadow it.
  http.get(`${env.API_URL}/videos/public`, ({ request }) => {
    const searchParams = new URL(request.url).searchParams;
    const category = searchParams.get("category");
    const q = searchParams.get("q");
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "24");

    let items = homeFeedFixtures;
    if (category) {
      items = items.filter((item) => item.category === category);
    }
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter((item) => (item.title ?? "").toLowerCase().includes(needle));
    }

    const total = items.length;
    const start = (page - 1) * limit;
    const pageItems = items.slice(start, start + limit);

    return HttpResponse.json<HomeFeedResponse>(
      { items: pageItems, total, page, limit },
      { status: 200 }
    );
  }),

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

  // GET /videos/:publicId/comments — note: NOT under /public/, matches the
  // upstream's own literal route (per social-interactions phase-06).
  http.get(`${env.API_URL}/videos/:publicId/comments`, ({ params, request }) => {
    if (params.publicId === PUBLIC_VIDEO_NOT_FOUND_TRIGGER) {
      return HttpResponse.json(publicVideoNotFoundEnvelope(), { status: 404 });
    }
    if ((params.publicId as string).startsWith(STATEFUL_COMMENTS_PREFIX)) {
      const items = getStatefulComments(params.publicId as string);
      return HttpResponse.json<FindCommentsResponse>(
        { items, total: items.length },
        { status: 200 }
      );
    }
    const limit = new URL(request.url).searchParams.get("limit");
    const items = limit ? [baseComment].slice(0, Number(limit)) : [baseComment];
    return HttpResponse.json<FindCommentsResponse>(
      { items, total: 1 },
      { status: 200 }
    );
  }),

  // POST /videos/:publicId/comments
  http.post(`${env.API_URL}/videos/:publicId/comments`, async ({ params, request }) => {
    if (params.publicId === PUBLIC_VIDEO_NOT_FOUND_TRIGGER) {
      return HttpResponse.json(publicVideoNotFoundEnvelope(), { status: 404 });
    }
    const body = (await request.json()) as { body: string };
    if ((params.publicId as string).startsWith(STATEFUL_COMMENTS_PREFIX)) {
      const items = getStatefulComments(params.publicId as string);
      const created = {
        ...baseComment,
        id: `comment-new-${items.length + 1}`,
        body: body.body,
        replies: [],
      };
      items.unshift(created);
      return HttpResponse.json<CreateCommentResponse>(created, { status: 201 });
    }
    return HttpResponse.json<CreateCommentResponse>(
      { ...baseComment, id: "comment-new", body: body.body },
      { status: 201 }
    );
  }),

  // POST /videos/:publicId/comments/:commentId/replies
  http.post(
    `${env.API_URL}/videos/:publicId/comments/:commentId/replies`,
    async ({ params, request }) => {
      if (params.publicId === PUBLIC_VIDEO_NOT_FOUND_TRIGGER) {
        return HttpResponse.json(publicVideoNotFoundEnvelope(), { status: 404 });
      }
      if (params.commentId === COMMENT_NOT_FOUND_TRIGGER) {
        return HttpResponse.json(commentNotFoundEnvelope(), { status: 404 });
      }
      if (params.commentId === REPLY_DEPTH_EXCEEDED_TRIGGER) {
        return HttpResponse.json(
          errorEnvelope("REPLY_DEPTH_EXCEEDED", "Cannot reply to a reply"),
          { status: 400 }
        );
      }
      const body = (await request.json()) as { body: string };
      // Replies never carry a `replies` field (depth-1 cap) — build the
      // shape explicitly rather than spreading `baseComment` wholesale.
      const reply = {
        id: `reply-${Date.now()}`,
        body: body.body,
        author: baseComment.author,
        createdAt: baseComment.createdAt,
        likesCount: baseComment.likesCount,
        dislikesCount: baseComment.dislikesCount,
        currentUserReaction: baseComment.currentUserReaction,
      };
      if ((params.publicId as string).startsWith(STATEFUL_COMMENTS_PREFIX)) {
        const items = getStatefulComments(params.publicId as string);
        const parent = items.find((item) => item.id === params.commentId);
        if (parent) {
          parent.replies = [...(parent.replies ?? []), reply];
        }
      }
      return HttpResponse.json<CreateReplyResponse>(reply, { status: 201 });
    }
  ),
];
