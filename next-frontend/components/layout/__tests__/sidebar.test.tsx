// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Sidebar } from "../sidebar";

describe("Sidebar", () => {
  it("renders its children", () => {
    render(
      <Sidebar open={false}>
        <span>nav items</span>
      </Sidebar>
    );
    expect(screen.getByText("nav items")).toBeInTheDocument();
  });

  it("reflects the open prop via data-open", () => {
    render(
      <Sidebar open>
        <span>nav items</span>
      </Sidebar>
    );
    expect(screen.getByText("nav items").closest("aside")).toHaveAttribute(
      "data-open",
      "true"
    );
  });
});
