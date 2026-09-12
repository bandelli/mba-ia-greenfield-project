import { http, HttpResponse } from "msw";

import type {
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

export const handlers = [
  // GET /channels/me
  http.get(`${env.API_URL}/channels/me`, () => {
    return HttpResponse.json<Channel>(baseChannel, { status: 200 });
  }),

  // PATCH /channels/me
  http.patch(`${env.API_URL}/channels/me`, async ({ request }) => {
    const body = (await request.json()) as Partial<Channel>;
    return HttpResponse.json<Channel>({ ...baseChannel, ...body }, { status: 200 });
  }),

  // GET /channels/me/videos
  http.get(`${env.API_URL}/channels/me/videos`, () => {
    return HttpResponse.json<OwnerVideoListResponse>(
      { items: [], page: 1, limit: 20, total: 0 },
      { status: 200 }
    );
  }),

  // GET /channels/:nickname
  http.get(`${env.API_URL}/channels/:nickname`, () => {
    return HttpResponse.json<PublicChannelInfo>(basePublicChannel, { status: 200 });
  }),

  // GET /channels/:nickname/videos
  http.get(`${env.API_URL}/channels/:nickname/videos`, () => {
    return HttpResponse.json<PublicVideoListResponse>(
      { items: [], page: 1, limit: 20, total: 0 },
      { status: 200 }
    );
  }),
];
