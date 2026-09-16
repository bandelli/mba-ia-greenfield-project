// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import { EmptySubscriptionsState } from "../empty-subscriptions-state"

describe("<EmptySubscriptionsState />", () => {
  it("renders the empty-state heading and description", () => {
    render(<EmptySubscriptionsState />)

    expect(screen.getByRole("heading", { name: "No subscriptions yet" })).toBeInTheDocument()
    expect(
      screen.getByText("You haven't subscribed to any channel yet.")
    ).toBeInTheDocument()
  })
})
