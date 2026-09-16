// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import { SubscribedChannelsList } from "../subscribed-channels-list"

describe("<SubscribedChannelsList />", () => {
  it("renders one row per followed channel", () => {
    render(
      <SubscribedChannelsList
        items={[
          { nickname: "techreviews", name: "Tech Reviews", avatarUrl: null },
          { nickname: "gamingcentral", name: "Gaming Central", avatarUrl: null },
        ]}
      />
    )

    expect(screen.getByText("Tech Reviews")).toBeInTheDocument()
    expect(screen.getByText("Gaming Central")).toBeInTheDocument()
    expect(screen.getAllByRole("link")).toHaveLength(2)
  })

  it("renders the empty state when there are no followed channels", () => {
    render(<SubscribedChannelsList items={[]} />)

    expect(screen.getByRole("heading", { name: "No subscriptions yet" })).toBeInTheDocument()
  })
})
