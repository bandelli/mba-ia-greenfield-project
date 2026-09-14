import { NextResponse } from "next/server";

import type { SuggestedVideosResponse } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  const searchParams = new URL(request.url).searchParams;
  const limit = searchParams.get("limit");

  const { data, error, response } = await upstream.GET(
    "/videos/public/{publicId}/suggested",
    {
      params: {
        path: { publicId },
        query: (limit !== null ? { limit } : {}) as never,
      },
    }
  );

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<SuggestedVideosResponse>(data, { status: 200 });
}
