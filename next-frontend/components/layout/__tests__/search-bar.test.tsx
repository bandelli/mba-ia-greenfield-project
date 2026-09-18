// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => currentSearchParams,
}));

import { SearchBar } from "../search-bar";

beforeEach(() => {
  push.mockClear();
  currentSearchParams = new URLSearchParams();
});

describe("SearchBar", () => {
  it("navigates with ?q= after the debounce delay once typing stops", async () => {
    render(<SearchBar />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "mari" } });
    expect(push).not.toHaveBeenCalled();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/?q=mari"), { timeout: 1000 });
  });

  it("navigates immediately on submit, without waiting for the debounce", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.type(screen.getByRole("searchbox"), "mari{Enter}");
    expect(push).toHaveBeenCalledWith("/?q=mari");
  });

  it("clears ?q= when the search value is emptied", async () => {
    currentSearchParams = new URLSearchParams("q=mari");
    const user = userEvent.setup();
    render(<SearchBar />);
    const input = screen.getByRole("searchbox");
    await user.clear(input);
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/?");
  });
});
