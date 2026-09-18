// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Spinner } from "../spinner";

describe("Spinner", () => {
  it("renders with role=status and an accessible label", () => {
    render(<Spinner />);
    const el = screen.getByRole("status");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("aria-label", "Loading");
    expect(el).toHaveAttribute("data-slot", "spinner");
  });

  it("accepts a custom aria-label", () => {
    render(<Spinner aria-label="Loading more videos" />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Loading more videos"
    );
  });

  it("merges a custom className with the default spin/size classes", () => {
    render(<Spinner className="size-4" data-testid="spinner" />);
    expect(screen.getByTestId("spinner").getAttribute("class")).toContain("size-4");
    expect(screen.getByTestId("spinner").getAttribute("class")).toContain("animate-spin");
  });
});
