// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { DescriptionCard } from "@/components/video/description-card"

const CHANNEL = { nickname: "webdevsimplified", name: "WebDev Simplified" }

describe("<DescriptionCard />", () => {
  it("expands the clamped description when 'Show more' is clicked, with no network request", async () => {
    const user = userEvent.setup()
    render(
      <DescriptionCard
        channel={CHANNEL}
        description="A long description that should be clamped by default."
        views={1234}
        publishedAt="2026-01-01T00:00:00.000Z"
      />
    )

    const description = screen.getByText(
      "A long description that should be clamped by default."
    )
    expect(description.className).toContain("line-clamp-3")

    await user.click(screen.getByRole("button", { name: "Show more" }))

    expect(description.className).not.toContain("line-clamp-3")
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument()
  })

  it("collapses the description again when 'Show less' is clicked", async () => {
    const user = userEvent.setup()
    render(
      <DescriptionCard
        channel={CHANNEL}
        description="A long description that should be clamped by default."
        views={1234}
        publishedAt="2026-01-01T00:00:00.000Z"
      />
    )

    await user.click(screen.getByRole("button", { name: "Show more" }))
    await user.click(screen.getByRole("button", { name: "Show less" }))

    expect(
      screen.getByText("A long description that should be clamped by default.")
        .className
    ).toContain("line-clamp-3")
  })

  it("renders no toggle button when there is no description", () => {
    render(
      <DescriptionCard
        channel={CHANNEL}
        description={null}
        views={1234}
        publishedAt="2026-01-01T00:00:00.000Z"
      />
    )

    expect(
      screen.queryByRole("button", { name: /show more/i })
    ).not.toBeInTheDocument()
  })
})
