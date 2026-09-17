// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Header } from "../header";

describe("Header", () => {
  it("renders the start, center, and end slots", () => {
    render(
      <Header
        start={<span>logo</span>}
        center={<span>search</span>}
        end={<span>avatar</span>}
      />
    );
    expect(screen.getByText("logo")).toBeInTheDocument();
    expect(screen.getByText("search")).toBeInTheDocument();
    expect(screen.getByText("avatar")).toBeInTheDocument();
  });

  it("renders a <header> landmark", () => {
    render(<Header start={null} center={null} end={null} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });
});
