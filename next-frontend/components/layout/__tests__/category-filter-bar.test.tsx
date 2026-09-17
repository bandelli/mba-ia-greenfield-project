// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => currentSearchParams,
}));

import { CategoryFilterBar } from "../category-filter-bar";

describe("CategoryFilterBar", () => {
  it("marks 'All' active when no ?category= is present", () => {
    currentSearchParams = new URLSearchParams();
    render(<CategoryFilterBar />);
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("data-active", "true");
  });

  it("marks the matching chip active from ?category=", () => {
    currentSearchParams = new URLSearchParams("category=music");
    render(<CategoryFilterBar />);
    expect(screen.getByRole("button", { name: "Music" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("data-active", "false");
  });

  it("navigates with the selected category and resets page on click", async () => {
    currentSearchParams = new URLSearchParams();
    const user = userEvent.setup();
    render(<CategoryFilterBar />);
    await user.click(screen.getByRole("button", { name: "Gaming" }));
    expect(push).toHaveBeenCalledWith("/?category=gaming");
  });

  it("clears the category param when 'All' is clicked", async () => {
    currentSearchParams = new URLSearchParams("category=music&page=2");
    const user = userEvent.setup();
    render(<CategoryFilterBar />);
    await user.click(screen.getByRole("button", { name: "All" }));
    expect(push).toHaveBeenCalledWith("/?");
  });
});
