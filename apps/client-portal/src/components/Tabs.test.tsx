import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "@sandy/ui";

describe("Tabs navigation", () => {
  it("renders every tab and marks the active one", () => {
    render(
      <Tabs
        items={[
          { value: "a", label: "Tab A" },
          { value: "b", label: "Tab B" },
        ]}
        value="a"
        onChange={() => undefined}
      />,
    );
    expect(screen.getByRole("tab", { name: "Tab A" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Tab B" })).toHaveAttribute("aria-selected", "false");
  });

  it("calls onChange with the clicked tab's value", async () => {
    const onChange = vi.fn();
    render(
      <Tabs
        items={[
          { value: "a", label: "Tab A" },
          { value: "b", label: "Tab B" },
        ]}
        value="a"
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Tab B" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
