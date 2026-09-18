import { proxyTusRequest } from "@/lib/api/tus-proxy"

// See lib/api/tus-proxy.ts's header comment for why this route bypasses the
// typed `upstream` client. Per-upload tus operations against a session
// already created via ../route.ts's POST.
export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  return proxyTusRequest(request, `/videos/uploads/${id}`)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  return proxyTusRequest(request, `/videos/uploads/${id}`)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  return proxyTusRequest(request, `/videos/uploads/${id}`)
}
