import { NextResponse } from "next/server";

import type { CommentReactionResponse, SetReactionDto } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";
import { getSession } from "@/lib/auth/session";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params;
  const session = await getSession();
  const body = (await request.json()) as SetReactionDto;

  const { data, error, response } = await upstream.PUT(
    "/comments/{commentId}/reaction",
    {
      params: { path: { commentId } },
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: body as never,
    }
  );

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<CommentReactionResponse>(data, { status: 200 });
}
