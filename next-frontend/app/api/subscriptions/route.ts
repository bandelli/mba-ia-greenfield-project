import { NextResponse } from "next/server";

import type { MySubscriptionsResponse } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";
import { getSession } from "@/lib/auth/session";

// Route path is a BFF-only projection decision (`/api/subscriptions` mirrors
// the Followed Channels Page's own route `/subscriptions`) — the upstream
// endpoint it forwards to is `GET /users/me/subscriptions`, per
// social-interactions/TD-05.
export async function GET(request: Request) {
  const session = await getSession();
  const searchParams = new URL(request.url).searchParams;

  const { data, error, response } = await upstream.GET(
    "/users/me/subscriptions",
    {
      params: { query: Object.fromEntries(searchParams) as never },
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }
  );

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<MySubscriptionsResponse>(data, { status: 200 });
}
