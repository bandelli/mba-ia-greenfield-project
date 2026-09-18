// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

import { AppShell } from "../app-shell"

describe("AppShell", () => {
  it("always renders the 3 static nav items regardless of the subscriptions prop", () => {
    render(
      <AppShell subscriptions={null}>
        <div>page content</div>
      </AppShell>
    )

    expect(screen.getByRole("link", { name: /Home/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Subscriptions/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Your videos/ })).toBeInTheDocument()
  })

  it("renders its children in the main content area", () => {
    render(
      <AppShell subscriptions={null}>
        <div>page content</div>
      </AppShell>
    )

    expect(screen.getByText("page content")).toBeInTheDocument()
  })

  it("renders no subscribed-channels section for an anonymous visitor (subscriptions=null)", () => {
    render(
      <AppShell subscriptions={null}>
        <div>page content</div>
      </AppShell>
    )

    expect(screen.queryByText("Subscribed channels")).not.toBeInTheDocument()
  })

  it("renders the subscribed-channels section with rows for a logged-in visitor", () => {
    render(
      <AppShell
        subscriptions={{
          items: [{ nickname: "techreviews", name: "Tech Reviews", avatarUrl: null }],
          total: 1,
        }}
      >
        <div>page content</div>
      </AppShell>
    )

    expect(screen.getByText("Subscribed channels")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Tech Reviews" })).toHaveAttribute(
      "href",
      "/channel/techreviews"
    )
  })

  it("renders the section's own empty state for a logged-in visitor with zero subscriptions", () => {
    render(
      <AppShell subscriptions={{ items: [], total: 0 }}>
        <div>page content</div>
      </AppShell>
    )

    expect(screen.getByText("Subscribed channels")).toBeInTheDocument()
    expect(screen.getByText("No subscriptions yet")).toBeInTheDocument()
  })
})
