import { redirect } from "next/navigation"

import { PaginationControls } from "@/components/subscriptions/pagination-controls"
import { SubscribedChannelsList } from "@/components/subscriptions/subscribed-channels-list"
import { upstream } from "@/lib/api/upstream"
import { getSession } from "@/lib/auth/session"
import { resolvePageParam } from "@/lib/utils"

const DEFAULT_LIMIT = 20

type SubscriptionsPageProps = {
  searchParams: Promise<{ page?: string }>
}

export default async function SubscriptionsPage({
  searchParams,
}: SubscriptionsPageProps) {
  const session = await getSession()

  if (!session.isLoggedIn) {
    redirect("/login")
  }

  const params = await searchParams
  const page = resolvePageParam(params.page)
  const offset = (page - 1) * DEFAULT_LIMIT

  // GET /users/me/subscriptions (unlike /channels/me/videos) only returns
  // `{items, total}` — no `page`/`limit` echoed back — so the page number and
  // total-pages count are derived here rather than read off the response.
  const { data, error } = await upstream.GET("/users/me/subscriptions", {
    params: { query: { limit: DEFAULT_LIMIT, offset } },
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })

  // Only documented error response for this endpoint is 401 UNAUTHORIZED
  // (§Error Catalog → UX mapping: redirect to /login).
  if (error) {
    redirect("/login")
  }

  const total = data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_LIMIT))
  const items = (data.items ?? []).map((channel) => ({
    nickname: channel.nickname ?? "",
    name: channel.name ?? "",
    avatarUrl: channel.avatarUrl ?? null,
  }))

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-h2 text-foreground">Subscriptions</h1>
      <SubscribedChannelsList items={items} />
      <PaginationControls page={page} totalPages={totalPages} />
    </div>
  )
}
