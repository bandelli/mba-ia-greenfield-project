// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import { SidebarSubscriptionsSection } from "../sidebar-subscriptions-section"

describe("SidebarSubscriptionsSection", () => {
  it("renders one row per followed channel", () => {
    render(
      <SidebarSubscriptionsSection
        items={[
          { nickname: "techreviews", name: "Tech Reviews", avatarUrl: null },
          { nickname: "gamingcentral", name: "Gaming Central", avatarUrl: null },
        ]}
        total={2}
      />
    )

    expect(screen.getByRole("link", { name: "Tech Reviews" })).toHaveAttribute(
      "href",
      "/channel/techreviews"
    )
    expect(screen.getByRole("link", { name: "Gaming Central" })).toHaveAttribute(
      "href",
      "/channel/gamingcentral"
    )
  })

  it("renders a compact empty state when there are no followed channels", () => {
    render(<SidebarSubscriptionsSection items={[]} total={0} />)

    expect(screen.getByText("No subscriptions yet")).toBeInTheDocument()
  })

  it("links to /subscriptions when there are more channels than fit in the sidebar", () => {
    render(
      <SidebarSubscriptionsSection
        items={[{ nickname: "techreviews", name: "Tech Reviews", avatarUrl: null }]}
        total={12}
      />
    )

    expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute(
      "href",
      "/subscriptions"
    )
  })

  it("hides the 'See all' link when every subscription already fits", () => {
    render(
      <SidebarSubscriptionsSection
        items={[{ nickname: "techreviews", name: "Tech Reviews", avatarUrl: null }]}
        total={1}
      />
    )

    expect(screen.queryByRole("link", { name: "See all" })).not.toBeInTheDocument()
  })
})
