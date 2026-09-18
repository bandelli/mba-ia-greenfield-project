// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import { SubscribedChannelRow } from "../subscribed-channel-row"

describe("<SubscribedChannelRow />", () => {
  it("renders the channel name and links to its public page", () => {
    render(
      <SubscribedChannelRow nickname="techreviews" name="Tech Reviews" avatarUrl={null} />
    )

    expect(screen.getByText("Tech Reviews")).toBeInTheDocument()
    expect(screen.getByRole("link")).toHaveAttribute("href", "/channel/techreviews")
  })

  it("renders the avatar image when a URL is provided", () => {
    render(
      <SubscribedChannelRow
        nickname="techreviews"
        name="Tech Reviews"
        avatarUrl="https://example.com/avatar.png"
      />
    )

    // empty `alt=""` (decorative avatar) gives the <img> ARIA role "presentation", not "img"
    expect(screen.getByRole("presentation")).toBeInTheDocument()
  })
})
