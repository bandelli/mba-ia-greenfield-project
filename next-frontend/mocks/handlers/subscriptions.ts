import { delay, http, HttpResponse } from "msw";

import type { MySubscriptionsResponse } from "@/lib/api/contracts";
import { env } from "@/lib/env";

// 22 fixtures (> app/subscriptions/page.tsx's DEFAULT_LIMIT of 20) so a real
// second page of results exists for SI-06.16b's pagination E2E scenario —
// no reserved trigger needed, offset/limit slicing is genuinely exercised.
const followedChannelFixtures: NonNullable<MySubscriptionsResponse["items"]> =
  Array.from({ length: 22 }, (_, i) => ({
    id: `channel-${i + 2}`,
    nickname: `channel-${i + 2}`,
    name: `Channel ${i + 2}`,
    avatarUrl: null,
  }));

export const handlers = [
  // GET /users/me/subscriptions
  http.get(`${env.API_URL}/users/me/subscriptions`, async ({ request }) => {
    // Small fixed delay so `app/subscriptions/loading.tsx`'s skeleton is
    // reliably observable in the E2E "exibir-skeleton-durante-carregamento"
    // scenario — this endpoint has only one consumer route, so the added
    // latency doesn't degrade the rest of the E2E suite the way a delay on a
    // widely-reused endpoint (e.g. video streaming) would.
    await delay(150);

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? followedChannelFixtures.length);
    const offset = Number(searchParams.get("offset") ?? 0);
    const items = followedChannelFixtures.slice(offset, offset + limit);

    return HttpResponse.json<MySubscriptionsResponse>(
      { items, total: followedChannelFixtures.length },
      { status: 200 }
    );
  }),
];
