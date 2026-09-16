import { NextResponse } from "next/server";

import type {
  CreateCommentDto,
  CreateCommentResponse,
  FindCommentsResponse,
} from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";
import { getSession } from "@/lib/auth/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  const searchParams = new URL(request.url).searchParams;
  const session = await getSession();

  // Optional-auth upstream endpoint (per social-interactions/TD-01) — a
  // logged-in caller's real `currentUserReaction` only comes back when the
  // token is actually forwarded.
  const { data, error, response } = await upstream.GET(
    "/videos/{publicId}/comments",
    {
      params: {
        path: { publicId },
        query: Object.fromEntries(searchParams) as never,
      },
      headers: session.isLoggedIn
        ? { Authorization: `Bearer ${session.accessToken}` }
        : undefined,
    }
  );

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<FindCommentsResponse>(data, { status: 200 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  const session = await getSession();
  const body = (await request.json()) as CreateCommentDto;

  const { data, error, response } = await upstream.POST(
    "/videos/{publicId}/comments",
    {
      params: { path: { publicId } },
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: body as never,
    }
  );

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<CreateCommentResponse>(data, { status: 201 });
}
