import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("renders the product message and independent-project disclosure", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /know what to study next/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not affiliated with or endorsed by ATI/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view on github/i }),
    ).toHaveAttribute("href", "https://github.com/Ishan-Wakade/nuraprep");
  });
});
