import { NextResponse } from "next/server"

import type { ApiErrorEnvelope } from "@/lib/api/contracts"

// Shared error-forwarding helper for BFF Route Handlers that pass upstream
// errors through unchanged (per next-frontend-bff-api.md — every handler
// destructures { data, error, response } from `upstream` and, on error,
// forwards the same envelope + status verbatim).
export function upstreamErrorResponse(
  error: unknown,
  status: number
): NextResponse<ApiErrorEnvelope> {
  return NextResponse.json<ApiErrorEnvelope>(error as ApiErrorEnvelope, {
    status,
  })
}
