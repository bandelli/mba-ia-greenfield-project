import { http, HttpResponse } from "msw";

import { env } from "@/lib/env";

// /videos/uploads is tus protocol middleware, not a Nest/OpenAPI route (see
// lib/api/tus-proxy.ts's header comment) — it has no `paths` entry, so these
// fixtures are hand-typed rather than paths-anchored, per
// next-frontend-msw-mocks.md's "exception to the contracts-barrel rule".
const TUS_RESUMABLE = "1.0.0";

export const handlers = [
  http.post(`${env.API_URL}/videos/uploads`, () =>
    new HttpResponse(null, {
      status: 201,
      headers: {
        "Tus-Resumable": TUS_RESUMABLE,
        Location: "/videos/uploads/fixture-upload-id",
      },
    })
  ),

  http.head(`${env.API_URL}/videos/uploads/:id`, () =>
    new HttpResponse(null, {
      status: 200,
      headers: {
        "Tus-Resumable": TUS_RESUMABLE,
        "Upload-Offset": "0",
        "Upload-Length": "1024",
        "Cache-Control": "no-store",
      },
    })
  ),

  http.patch(`${env.API_URL}/videos/uploads/:id`, () =>
    new HttpResponse(null, {
      status: 204,
      headers: {
        "Tus-Resumable": TUS_RESUMABLE,
        "Upload-Offset": "1024",
        "X-Video-Public-Id": "pub-fixture-123",
      },
    })
  ),

  http.delete(`${env.API_URL}/videos/uploads/:id`, () =>
    new HttpResponse(null, {
      status: 204,
      headers: { "Tus-Resumable": TUS_RESUMABLE },
    })
  ),
];
