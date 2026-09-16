import { NextResponse } from "next/server";

import type { SetReactionDto, VideoReactionResponse } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";
import { getSession } from "@/lib/auth/session";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  const session = await getSession();
  const body = (await request.json()) as SetReactionDto;

  const { data, error, response } = await upstream.PUT(
    "/videos/{publicId}/reaction",
    {
      params: { path: { publicId } },
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: body as never,
    }
  );

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<VideoReactionResponse>(data, { status: 200 });
}
