import { NextResponse } from "next/server";

import type { UpdateVideoDto, Video } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";
import { getSession } from "@/lib/auth/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  const body = (await request.json()) as UpdateVideoDto;

  const { data, error, response } = await upstream.POST(
    "/videos/{id}/publish",
    {
      params: { path: { id } },
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: body as never,
    }
  );

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<Video>(data, { status: 200 });
}
