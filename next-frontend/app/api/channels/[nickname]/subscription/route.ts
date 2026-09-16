import { NextResponse } from "next/server";

import type { SetSubscriptionDto, SubscriptionResponse } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";
import { getSession } from "@/lib/auth/session";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ nickname: string }> }
) {
  const { nickname } = await params;
  const session = await getSession();
  const body = (await request.json()) as SetSubscriptionDto;

  const { data, error, response } = await upstream.PUT(
    "/channels/{nickname}/subscription",
    {
      params: { path: { nickname } },
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: body as never,
    }
  );

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<SubscriptionResponse>(data, { status: 200 });
}
