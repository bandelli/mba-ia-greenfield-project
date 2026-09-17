// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Avatar, AvatarImage, AvatarFallback } from "../avatar";

describe("Avatar", () => {
  it("renders with data-slot=avatar and default size", () => {
    render(
      <Avatar data-testid="avatar">
        <AvatarFallback>MM</AvatarFallback>
      </Avatar>
    );
    const el = screen.getByTestId("avatar");
    expect(el).toHaveAttribute("data-slot", "avatar");
    expect(el).toHaveAttribute("data-size", "default");
  });

  it("reflects the size prop via data-size", () => {
    render(
      <Avatar data-testid="avatar" size="lg">
        <AvatarFallback>MM</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByTestId("avatar")).toHaveAttribute("data-size", "lg");
  });

  it("renders the initials fallback when no image loads", () => {
    render(
      <Avatar>
        <AvatarImage src="" alt="" />
        <AvatarFallback>MM</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("MM")).toBeInTheDocument();
    expect(screen.getByText("MM")).toHaveAttribute("data-slot", "avatar-fallback");
  });
});
