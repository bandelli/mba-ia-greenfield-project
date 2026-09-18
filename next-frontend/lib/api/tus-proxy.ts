import "server-only"

import { getSession } from "@/lib/auth/session"
import { env } from "@/lib/env"

// tus (nestjs-project's resumable video-upload protocol, mounted at
// /videos/uploads as Express middleware — see nestjs-project's
// tus-upload.middleware.ts) is NOT in the OpenAPI spec: it's a binary,
// header-driven protocol, not a JSON API call, so the typed `upstream`
// client structurally cannot represent it. This raw-`fetch` proxy is a
// deliberate, narrow exception to next-frontend-bff-api.md's "no raw
// fetch(env.API_URL + ...) — use upstream" rule, not an oversight.
//
// Why a proxy at all, instead of the browser's tus-js-client hitting
// nestjs-api directly: the access token lives only in an httpOnly
// iron-session cookie (lib/auth/session.ts) — browser JS cannot read it to
// set the Authorization header the upstream tus endpoint requires. Routing
// through this same-origin proxy lets it attach that header server-side
// (from the session the browser's request already carries automatically)
// without ever exposing the token to client-side code, and keeps the BFF
// model's "browser never talks to upstream directly" invariant intact.

const TUS_REQUEST_HEADERS = [
  "tus-resumable",
  "upload-length",
  "upload-defer-length",
  "upload-metadata",
  "upload-offset",
  "content-type",
]

const TUS_RESPONSE_HEADERS = [
  "tus-resumable",
  "tus-version",
  "tus-extension",
  "tus-max-size",
  "upload-offset",
  "upload-length",
  "upload-defer-length",
  "upload-metadata",
  "location",
  "cache-control",
  "x-video-public-id",
  // Not tus-specific, but needed to preserve the JSON error envelope's
  // shape (400/401/413/422 bodies from TusAuthMiddleware/onUploadCreate/
  // onUploadFinish) when it's forwarded through unchanged.
  "content-type",
]

// Statuses the Fetch/Response spec forbids a body on — passing a body
// (even an empty stream) for these throws at runtime.
const BODYLESS_STATUSES = new Set([101, 204, 205, 304])

function unauthenticatedResponse(): Response {
  return Response.json(
    {
      statusCode: 401,
      error: "UPLOAD_UNAUTHENTICATED",
      message: "Authentication required.",
    },
    { status: 401 }
  )
}

// Forwards one tus-protocol request (POST create, HEAD offset-check, PATCH
// chunk, or DELETE cancel) to nestjs-api's tus endpoint, injecting the
// session's access token server-side and mirroring every tus-relevant
// header back to the browser — including the custom X-Video-Public-Id
// header the backend's onUploadFinish hook adds on the completing PATCH.
export async function proxyTusRequest(
  request: Request,
  upstreamPath: string
): Promise<Response> {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return unauthenticatedResponse()
  }

  const headers = new Headers()
  for (const name of TUS_REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value !== null) headers.set(name, value)
  }
  headers.set("Authorization", `Bearer ${session.accessToken}`)

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(`${env.API_URL}${upstreamPath}`, {
      method: request.method,
      headers,
      body: request.body,
      duplex: "half",
    } as RequestInit)
  } catch (error) {
    // TEMP diagnostic — this proxy 500s with no visible stack in CI (works
    // locally); logging the raw error to find the real cause before
    // deciding a fix. Remove once root-caused.
    console.error("[tus-proxy] fetch to upstream threw:", error)
    throw error
  }

  const responseHeaders = new Headers()
  for (const name of TUS_RESPONSE_HEADERS) {
    const value = upstreamResponse.headers.get(name)
    if (value !== null) responseHeaders.set(name, value)
  }

  const location = responseHeaders.get("location")
  if (location) {
    responseHeaders.set(
      "location",
      location.replace("/videos/uploads/", "/api/videos/uploads/")
    )
  }

  const hasBody = !BODYLESS_STATUSES.has(upstreamResponse.status)
  return new Response(hasBody ? upstreamResponse.body : null, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  })
}
