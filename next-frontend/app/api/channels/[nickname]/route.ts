import { NextResponse } from "next/server";

import type { PublicChannelInfo } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";
import { getSession } from "@/lib/auth/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ nickname: string }> }
) {
  const { nickname } = await params;
  const session = await getSession();

  // Optional-auth upstream endpoint (per social-interactions/TD-01) — a
  // logged-in caller's real `isSubscribed` state only comes back when the
  // token is actually forwarded.
  const { data, error, response } = await upstream.GET(
    "/channels/{nickname}",
    {
      params: { path: { nickname } },
      headers: session.isLoggedIn
        ? { Authorization: `Bearer ${session.accessToken}` }
        : undefined,
    }
  );

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<PublicChannelInfo>(data, { status: 200 });
}
