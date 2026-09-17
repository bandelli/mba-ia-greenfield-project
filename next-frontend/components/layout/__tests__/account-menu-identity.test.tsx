// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, it, expect } from "vitest";

import { server } from "@/mocks/server";
import { AccountMenuIdentity } from "../account-menu-identity";

describe("AccountMenuIdentity", () => {
  it("shows a loading state before the channel data arrives", () => {
    server.use(
      http.get("/api/channels/me", async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ id: "1", name: "Mari Martin", nickname: "marimartin" });
      })
    );
    render(<AccountMenuIdentity />);
    expect(screen.getByTestId("account-menu-identity-loading")).toBeInTheDocument();
  });

  it("renders avatar initials, name, and @nickname once loaded", async () => {
    server.use(
      http.get("/api/channels/me", () =>
        HttpResponse.json({ id: "1", name: "Mari Martin", nickname: "marimartin" })
      )
    );
    render(<AccountMenuIdentity />);
    expect(await screen.findByText("Mari Martin")).toBeInTheDocument();
    expect(screen.getByText("@marimartin")).toBeInTheDocument();
    expect(screen.getByText("MM")).toBeInTheDocument();
  });
});
