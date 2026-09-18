import { NextResponse } from "next/server";

import type { VideoThumbnailResponse } from "@/lib/api/contracts";
import { upstreamErrorResponse } from "@/lib/api/bff-response";
import { upstream } from "@/lib/api/upstream";
import { getSession } from "@/lib/auth/session";

// Forwards the incoming multipart/form-data body via FormData rather than a
// raw stream — openapi-fetch's body serializer passes a FormData instance
// straight to fetch untouched (letting it set Content-Type + boundary), and
// FormData is the only body shape the typed `upstream` client accepts for a
// multipart operation (per next-frontend-bff-api.md's "no raw fetch" rule).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  const formData = await request.formData();

  const { data, error, response } = await upstream.PATCH(
    "/videos/{id}/thumbnail",
    {
      params: { path: { id } },
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: formData as never,
    }
  );

  if (error) {
    return upstreamErrorResponse(error, response.status);
  }

  return NextResponse.json<VideoThumbnailResponse>(data, { status: 200 });
}
