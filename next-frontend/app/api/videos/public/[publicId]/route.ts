import { NextResponse } from "next/server";

import type { PublicVideoDetail } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;

  const { data, error, response } = await upstream.GET(
    "/videos/public/{publicId}",
    { params: { path: { publicId } } }
  );

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<PublicVideoDetail>(data, { status: 200 });
}
