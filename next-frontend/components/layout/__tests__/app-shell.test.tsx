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
  it("always renders the 3 static nav items regardless of subscriptionsSlot", () => {
    render(
      <AppShell subscriptionsSlot={null}>
        <div>page content</div>
      </AppShell>
    )

    expect(screen.getByRole("link", { name: /Home/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Subscriptions/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Your videos/ })).toBeInTheDocument()
  })

  it("renders its children in the main content area", () => {
    render(
      <AppShell subscriptionsSlot={null}>
        <div>page content</div>
      </AppShell>
    )

    expect(screen.getByText("page content")).toBeInTheDocument()
  })

  it("renders nothing extra in the sidebar when subscriptionsSlot is null (anonymous visitor)", () => {
    render(
      <AppShell subscriptionsSlot={null}>
        <div>page content</div>
      </AppShell>
    )

    expect(screen.queryByText("Subscribed channels")).not.toBeInTheDocument()
  })

  it("renders whatever subscriptionsSlot it's given in the sidebar", () => {
    // What actually fills this slot in production (the subscribed-channels
    // section's rows/empty-state rendering) is covered by
    // sidebar-subscriptions-section.test.tsx — this only verifies AppShell
    // places the slot content in the sidebar, since app/(main)/layout.tsx
    // now hands it a Suspense-wrapped async component rather than resolved
    // data (keeping that fetch from gating `children`'s own render).
    render(
      <AppShell subscriptionsSlot={<div>sidebar subscriptions slot</div>}>
        <div>page content</div>
      </AppShell>
    )

    expect(screen.getByText("sidebar subscriptions slot")).toBeInTheDocument()
  })
})
