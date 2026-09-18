import { NextResponse } from "next/server";

import type { HomeFeedResponse } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const category = searchParams.get("category");
  const q = searchParams.get("q");
  const page = searchParams.get("page");
  const limit = searchParams.get("limit");

  const { data, error, response } = await upstream.GET("/videos/public", {
    params: {
      query: {
        ...(category !== null && { category }),
        ...(q !== null && { q }),
        ...(page !== null && { page }),
        ...(limit !== null && { limit }),
      } as never,
    },
  });

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<HomeFeedResponse>(data, { status: 200 });
}
