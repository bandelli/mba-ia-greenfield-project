// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { CategoryChip } from "../category-chip";

describe("CategoryChip", () => {
  it("renders the label and reflects the active state via data-active", () => {
    render(<CategoryChip label="Music" active />);
    const chip = screen.getByRole("button", { name: "Music" });
    expect(chip).toHaveAttribute("data-active", "true");
  });

  it("defaults to inactive", () => {
    render(<CategoryChip label="Gaming" />);
    expect(screen.getByRole("button", { name: "Gaming" })).toHaveAttribute(
      "data-active",
      "false"
    );
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<CategoryChip label="News" onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: "News" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
