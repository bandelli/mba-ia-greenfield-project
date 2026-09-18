import { proxyTusRequest } from "@/lib/api/tus-proxy"

// See lib/api/tus-proxy.ts's header comment for why this route bypasses the
// typed `upstream` client. Handles tus upload-session creation only —
// per-upload operations (HEAD/PATCH/DELETE) live at ./[id]/route.ts.
export async function POST(request: Request): Promise<Response> {
  return proxyTusRequest(request, "/videos/uploads")
}
