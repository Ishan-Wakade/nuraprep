import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "./not-found";

describe("NotFound", () => {
  it("offers clear routes back into the application", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { name: /isn't part of nuraprep/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /open math practice/i }),
    ).toHaveAttribute("href", "/practice");
    expect(screen.getByRole("link", { name: /return home/i })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
