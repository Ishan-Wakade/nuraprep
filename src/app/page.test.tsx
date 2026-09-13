import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("renders the product message and independent-project disclosure", () => {
    const { container } = render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /your tool to master the teas math section/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /uses adaptive learning to diagnose weak skills, explain every answer, and make practice as personalized as possible/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not affiliated with or endorsed by ATI/i),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".hero-actions a[href*='github.com']"),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector(".roadmap-card a[href*='github.com']"),
    ).toHaveAttribute("href", "https://github.com/Ishan-Wakade/nuraprep");
    expect(
      screen.getByRole("link", { name: /open math practice/i }),
    ).toHaveAttribute("href", "/practice");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(screen.queryByText(/one section, done carefully/i)).toBeNull();
    expect(
      screen.getByText(/expanding to other sections/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/honest score predictions using evidence/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/questions reviewed with traceable evidence/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/a focused diagnostic separates/i)).toBeNull();
    expect(
      screen.queryByText(/the public roadmap shows what is implemented/i),
    ).toBeNull();
  });
});
