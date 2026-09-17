// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { CreateButton } from "../create-button";

describe("CreateButton", () => {
  it("renders a link to the existing upload flow", () => {
    render(<CreateButton />);
    expect(screen.getByRole("link", { name: "Create video" })).toHaveAttribute(
      "href",
      "/dashboard/videos/upload"
    );
  });
});
