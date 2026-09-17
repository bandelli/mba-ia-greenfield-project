// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Badge } from "../badge";

describe("Badge", () => {
  it("renders with data-slot=badge and default variant", () => {
    render(<Badge>14:20</Badge>);
    const el = screen.getByText("14:20");
    expect(el).toHaveAttribute("data-slot", "badge");
    expect(el).toHaveAttribute("data-variant", "default");
  });

  it("reflects the variant prop via data-variant", () => {
    render(<Badge variant="secondary">Live</Badge>);
    expect(screen.getByText("Live")).toHaveAttribute("data-variant", "secondary");
  });

  it("merges a custom className with the variant classes", () => {
    render(<Badge className="absolute bottom-1 right-1">14:20</Badge>);
    expect(screen.getByText("14:20").className).toContain("absolute");
  });
});
