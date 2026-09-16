// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import { PaginationControls } from "../pagination-controls"

describe("<PaginationControls />", () => {
  it("renders enabled prev/next links pointing to the correct pages", () => {
    render(<PaginationControls page={2} totalPages={3} />)

    const prev = screen.getByRole("link", { name: "Previous page" })
    const next = screen.getByRole("link", { name: "Next page" })
    expect(prev).toHaveAttribute("href", "?page=1")
    expect(next).toHaveAttribute("href", "?page=3")
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument()
  })

  it("disables the previous control on page 1", () => {
    render(<PaginationControls page={1} totalPages={3} />)

    expect(screen.queryByRole("link", { name: "Previous page" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled()
  })

  it("disables the next control on the last page", () => {
    render(<PaginationControls page={3} totalPages={3} />)

    expect(screen.queryByRole("link", { name: "Next page" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled()
  })
})
