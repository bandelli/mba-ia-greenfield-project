import { NextResponse } from "next/server";

import type { PublicVideoListResponse } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nickname: string }> }
) {
  const { nickname } = await params;
  const searchParams = new URL(request.url).searchParams;

  const { data, error, response } = await upstream.GET(
    "/channels/{nickname}/videos",
    {
      params: {
        path: { nickname },
        query: Object.fromEntries(searchParams) as never,
      },
    }
  );

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<PublicVideoListResponse>(data, { status: 200 });
}
