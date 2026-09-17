// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { SidebarToggleButton } from "../sidebar-toggle-button";

describe("SidebarToggleButton", () => {
  it("calls onToggle when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<SidebarToggleButton open={false} onToggle={onToggle} />);
    await user.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("reflects the open state via aria-pressed and label", () => {
    render(<SidebarToggleButton open onToggle={() => {}} />);
    const btn = screen.getByRole("button", { name: "Close sidebar" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the closed-state label when not open", () => {
    render(<SidebarToggleButton open={false} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: "Open sidebar" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
});
