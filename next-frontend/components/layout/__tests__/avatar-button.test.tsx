// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";

import { SessionContext, type SessionState } from "@/components/auth/session-provider";
import { AvatarButton } from "../avatar-button";

function renderWithSession(session: SessionState) {
  return render(
    <SessionContext.Provider value={session}>
      <AvatarButton menu={<div>Account menu content</div>} />
    </SessionContext.Provider>
  );
}

describe("AvatarButton", () => {
  it("renders a login link when the session is anonymous", () => {
    renderWithSession({ userId: "", email: "", channelSlug: "", isLoggedIn: false });
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });

  it("renders the avatar trigger when authenticated", () => {
    renderWithSession({
      userId: "u1",
      email: "mari@example.com",
      channelSlug: "marimartin",
      isLoggedIn: true,
    });
    expect(screen.getByRole("button", { name: "Open account menu" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
  });

  it("opens the account menu sheet when the avatar is clicked", async () => {
    const user = userEvent.setup();
    renderWithSession({
      userId: "u1",
      email: "mari@example.com",
      channelSlug: "marimartin",
      isLoggedIn: true,
    });
    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(await screen.findByText("Account menu content")).toBeInTheDocument();
  });
});
