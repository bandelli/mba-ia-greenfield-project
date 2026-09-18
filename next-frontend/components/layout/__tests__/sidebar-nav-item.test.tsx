// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

let currentPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

import { SidebarNavItem } from "../sidebar-nav-item";

describe("SidebarNavItem", () => {
  it("marks itself active when the current route matches href", () => {
    currentPathname = "/";
    render(<SidebarNavItem href="/" label="Home" icon={<svg />} />);
    expect(screen.getByRole("link", { name: /Home/ })).toHaveAttribute(
      "data-active",
      "true"
    );
  });

  it("is not active when the current route does not match href", () => {
    currentPathname = "/subscriptions";
    render(<SidebarNavItem href="/" label="Home" icon={<svg />} />);
    expect(screen.getByRole("link", { name: /Home/ })).toHaveAttribute(
      "data-active",
      "false"
    );
  });

  it("links to the given href", () => {
    currentPathname = "/";
    render(<SidebarNavItem href="/subscriptions" label="Subscriptions" icon={<svg />} />);
    expect(screen.getByRole("link", { name: /Subscriptions/ })).toHaveAttribute(
      "href",
      "/subscriptions"
    );
  });
});
