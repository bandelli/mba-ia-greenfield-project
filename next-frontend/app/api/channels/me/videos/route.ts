import { NextResponse } from "next/server";

import type { OwnerVideoListResponse } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";
import { getSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const session = await getSession();
  const searchParams = new URL(request.url).searchParams;

  const { data, error, response } = await upstream.GET("/channels/me/videos", {
    params: { query: Object.fromEntries(searchParams) as never },
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<OwnerVideoListResponse>(data, { status: 200 });
}
