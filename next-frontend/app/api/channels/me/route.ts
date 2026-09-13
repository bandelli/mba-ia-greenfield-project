import { NextResponse } from "next/server";

import type { Channel, UpdateChannelDto } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();

  const { data, error, response } = await upstream.GET("/channels/me", {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<Channel>(data, { status: 200 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  const body = (await request.json()) as UpdateChannelDto;

  const { data, error, response } = await upstream.PATCH("/channels/me", {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    body: body as never,
  });

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<Channel>(data, { status: 200 });
}
