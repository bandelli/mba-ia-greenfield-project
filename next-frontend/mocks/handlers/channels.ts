import { http, HttpResponse } from "msw";

import type {
  ApiErrorEnvelope,
  Channel,
  OwnerVideoListResponse,
  PublicChannelInfo,
  PublicVideoListResponse,
} from "@/lib/api/contracts";
import { env } from "@/lib/env";

const baseChannel: Channel = {
  id: "channel-1",
  name: "Alice",
  nickname: "alice",
  description: "Fixture channel",
  created_at: "2026-09-12T00:00:00.000Z",
  updated_at: "2026-09-12T00:00:00.000Z",
};

const basePublicChannel: PublicChannelInfo = {
  id: "channel-1",
  name: "Alice",
  nickname: "alice",
  description: "Fixture channel",
  created_at: "2026-09-12T00:00:00.000Z",
};

// Reserved trigger (E2E + Vitest) — a `search` value that always yields an empty
// list, for exercising the dashboard's empty state without a real search index.
export const EMPTY_VIDEO_LIST_SEARCH_TRIGGER = "no-videos-match-this-search";

// Reserved trigger (E2E + Vitest) — a `nickname` value that always yields
// 409 CHANNEL_NICKNAME_TAKEN on PATCH /channels/me.
export const NICKNAME_TAKEN_TRIGGER = "taken_nickname";

// Reserved trigger (E2E + Vitest) — a `:nickname` path value that always
// yields 404 CHANNEL_NOT_FOUND on both GET /channels/:nickname and
// GET /channels/:nickname/videos.
export const CHANNEL_NOT_FOUND_TRIGGER = "nickname-does-not-exist";

// Reserved trigger (E2E + Vitest) — a `:nickname` path value that always
// yields an empty list on GET /channels/:nickname/videos (the channel itself
// still resolves normally).
export const EMPTY_PUBLIC_VIDEO_LIST_TRIGGER = "channel-with-no-public-videos";

const ownerVideoFixtures: NonNullable<OwnerVideoListResponse["items"]> = [
  {
    id: "video-1",
    public_id: "pub123",
    title: "My Awesome Tech Review 2024 - Best Gadgets of the Year",
    thumbnail_key: "thumbnails/video-1.png",
    category: "tech",
    visibility: "public",
    status: "ready",
    published_at: "2026-09-10T00:00:00.000Z",
    views: 124_000,
    likes: 5_200,
    comments: 432,
  },
  {
    id: "video-2",
    public_id: "pub456",
    title: "How I Built My First App in 30 Days - Complete Guide",
    thumbnail_key: "thumbnails/video-2.png",
    category: "tech",
    visibility: "unlisted",
    status: "ready",
    published_at: "2026-08-29T00:00:00.000Z",
    views: 45_000,
    likes: 2_100,
    comments: 178,
  },
];

const publicVideoFixtures: NonNullable<PublicVideoListResponse["items"]> = [
  {
    id: "video-1",
    public_id: "react19",
    title: "React 19 Complete Crash Course - Everything New",
    thumbnail_key: "thumbnails/video-1.png",
    duration_seconds: 860,
    published_at: "2026-09-10T00:00:00.000Z",
    views: 124_000,
  },
  {
    id: "video-2",
    public_id: "nextjs14",
    title: "Build a Next.js 14 Dashboard App | Full Stack Tutorial",
    thumbnail_key: "thumbnails/video-2.png",
    duration_seconds: 1725,
    published_at: "2026-09-05T00:00:00.000Z",
    views: 342_000,
  },
];

// Not typed via `HttpResponse.json<ApiErrorEnvelope>` at the call sites below
// — MSW's `http.get`/`http.patch` infers a single response-body type param
// from the resolver, so an explicit generic on the error branch conflicts
// with the success branch's explicit `Channel`/`PublicChannelInfo`/etc.
// generic in the same function (confirmed: doing so fails `tsc --noEmit`
// with a type-union error). `videos.ts`'s `errorEnvelope()` already
// established this same untyped-error-branch pattern for the identical
// reason — mirrored here rather than fighting MSW's generic inference.
function notFoundEnvelope(): ApiErrorEnvelope {
  return { statusCode: 404, error: "CHANNEL_NOT_FOUND", message: "Channel not found", code: null };
}

export const handlers = [
  // GET /channels/me
  http.get(`${env.API_URL}/channels/me`, () => {
    return HttpResponse.json<Channel>(baseChannel, { status: 200 });
  }),

  // PATCH /channels/me
  http.patch(`${env.API_URL}/channels/me`, async ({ request }) => {
    const body = (await request.json()) as Partial<Channel>;
    if (body.nickname === NICKNAME_TAKEN_TRIGGER) {
      return HttpResponse.json(
        { statusCode: 409, error: "CHANNEL_NICKNAME_TAKEN", message: "Nickname already taken", code: null },
        { status: 409 }
      );
    }
    return HttpResponse.json<Channel>(
      { ...baseChannel, ...body, updated_at: new Date().toISOString() },
      { status: 200 }
    );
  }),

  // GET /channels/me/videos
  http.get(`${env.API_URL}/channels/me/videos`, ({ request }) => {
    const search = new URL(request.url).searchParams.get("search");
    const items = search === EMPTY_VIDEO_LIST_SEARCH_TRIGGER ? [] : ownerVideoFixtures;

    return HttpResponse.json<OwnerVideoListResponse>(
      { items, page: 1, limit: 20, total: items.length },
      { status: 200 }
    );
  }),

  // GET /channels/:nickname
  http.get(`${env.API_URL}/channels/:nickname`, ({ params }) => {
    if (params.nickname === CHANNEL_NOT_FOUND_TRIGGER) {
      return HttpResponse.json(notFoundEnvelope(), { status: 404 });
    }
    return HttpResponse.json<PublicChannelInfo>(
      { ...basePublicChannel, nickname: params.nickname as string },
      { status: 200 }
    );
  }),

  // GET /channels/:nickname/videos
  http.get(`${env.API_URL}/channels/:nickname/videos`, ({ params }) => {
    if (params.nickname === CHANNEL_NOT_FOUND_TRIGGER) {
      return HttpResponse.json(notFoundEnvelope(), { status: 404 });
    }
    const items = params.nickname === EMPTY_PUBLIC_VIDEO_LIST_TRIGGER ? [] : publicVideoFixtures;

    return HttpResponse.json<PublicVideoListResponse>(
      { items, page: 1, limit: 20, total: items.length },
      { status: 200 }
    );
  }),
];
