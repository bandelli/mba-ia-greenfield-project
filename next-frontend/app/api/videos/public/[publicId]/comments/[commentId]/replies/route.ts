import { NextResponse } from "next/server";

import type { CreateCommentDto, CreateReplyResponse } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";
import { getSession } from "@/lib/auth/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicId: string; commentId: string }> }
) {
  const { publicId, commentId } = await params;
  const session = await getSession();
  const body = (await request.json()) as CreateCommentDto;

  const { data, error, response } = await upstream.POST(
    "/videos/{publicId}/comments/{commentId}/replies",
    {
      params: { path: { publicId, commentId } },
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: body as never,
    }
  );

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<CreateReplyResponse>(data, { status: 201 });
}
