// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../sheet";

function renderSheet(onOpenChange?: (open: boolean) => void) {
  return render(
    <Sheet onOpenChange={onOpenChange}>
      <SheetTrigger>Open account menu</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Account</SheetTitle>
        </SheetHeader>
        <p>Sheet body</p>
      </SheetContent>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("opens via the trigger and renders content with data-slot=sheet-content", async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByText("Open account menu"));
    const content = await screen.findByText("Sheet body");
    expect(content).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("data-slot", "sheet-content");
  });

  it("calls onOpenChange(true) when opened", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderSheet(onOpenChange);
    await user.click(screen.getByText("Open account menu"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("closes when the built-in close button is clicked", async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByText("Open account menu"));
    await screen.findByText("Sheet body");
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Sheet body")).not.toBeInTheDocument();
  });

  it("closes on Escape (Radix Dialog default behavior)", async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByText("Open account menu"));
    await screen.findByText("Sheet body");
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Sheet body")).not.toBeInTheDocument();
  });
});
