import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@sandy/ui";

const setTheme = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme }),
}));

describe("ThemeToggle", () => {
  it("switches from light to dark when clicked", async () => {
    render(<ThemeToggle />);
    const button = await waitFor(() => screen.getByRole("button", { name: /switch to dark theme/i }));
    await userEvent.click(button);
    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});
