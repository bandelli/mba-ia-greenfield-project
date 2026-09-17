// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { AccountMenuItem } from "../account-menu-item";

describe("AccountMenuItem", () => {
  it("renders as a link when given href (Edit Channel variant)", () => {
    render(<AccountMenuItem href="/dashboard/channel" label="Edit Channel" icon={<svg />} />);
    expect(screen.getByRole("link", { name: /Edit Channel/ })).toHaveAttribute(
      "href",
      "/dashboard/channel"
    );
  });

  it("renders as a button and calls onClick when given onClick (Sign Out variant)", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<AccountMenuItem onClick={onClick} label="Sign Out" icon={<svg />} />);
    const btn = screen.getByRole("button", { name: /Sign Out/ });
    await user.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
