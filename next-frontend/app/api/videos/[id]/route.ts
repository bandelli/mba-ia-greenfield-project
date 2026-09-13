import { NextResponse } from "next/server";

import type { UpdateVideoDto, Video } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";
import { getSession } from "@/lib/auth/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();

  const { data, error, response } = await upstream.GET("/videos/{id}", {
    params: { path: { id } },
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<Video>(data, { status: 200 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  const body = (await request.json()) as UpdateVideoDto;

  const { data, error, response } = await upstream.PATCH("/videos/{id}", {
    params: { path: { id } },
    headers: { Authorization: `Bearer ${session.accessToken}` },
    body: body as never,
  });

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<Video>(data, { status: 200 });
}
