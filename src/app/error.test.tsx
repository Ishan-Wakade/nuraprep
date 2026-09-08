import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ApplicationError from "./error";

describe("ApplicationError", () => {
  it("offers recovery without exposing an error message", () => {
    const retry = vi.fn();
    render(
      <ApplicationError
        error={new Error("database credentials must never appear here")}
        retry={retry}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /couldn't finish loading this page/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/database credentials/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /return to math practice/i }),
    ).toHaveAttribute("href", "/practice");

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
