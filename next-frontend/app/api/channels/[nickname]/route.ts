import { NextResponse } from "next/server";

import type { PublicChannelInfo } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ nickname: string }> }
) {
  const { nickname } = await params;

  const { data, error, response } = await upstream.GET(
    "/channels/{nickname}",
    { params: { path: { nickname } } }
  );

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<PublicChannelInfo>(data, { status: 200 });
}
