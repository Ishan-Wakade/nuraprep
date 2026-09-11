import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReadinessTrend } from "./readiness-trend";

describe("ReadinessTrend", () => {
  it("renders an accessible chronological chart and exact snapshot table", () => {
    const { container } = render(
      <ReadinessTrend
        selectedEstimateId="newer"
        history={[
          {
            id: "newer",
            estimateBasisPoints: 6420,
            lowerBasisPoints: 5220,
            upperBasisPoints: 7620,
            evidenceLevel: "DEVELOPING",
            evidenceCount: 12,
            createdAt: "2026-09-10T14:30:00.000Z",
          },
          {
            id: "older",
            estimateBasisPoints: 5100,
            lowerBasisPoints: 3300,
            upperBasisPoints: 6900,
            evidenceLevel: "LOW",
            evidenceCount: 3,
            createdAt: "2026-09-01T14:30:00.000Z",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("img", { name: /2 saved NuraPrep Math readiness/i }),
    ).toBeInTheDocument();
    expect(container.querySelector("polyline")).toHaveAttribute(
      "points",
      expect.stringMatching(/^58,/),
    );
    expect(container.querySelectorAll("svg circle")).toHaveLength(2);

    const table = screen.getByRole("table", {
      name: "Exact readiness estimate history",
    });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByText("64.2%")).toBeInTheDocument();
    expect(within(table).getByText("52.2%–76.2%")).toBeInTheDocument();
    expect(
      within(table).getByRole("link", { current: "page" }),
    ).toHaveAttribute("href", "/practice/progress?estimate=newer");
  });

  it("does not imply a trend from one snapshot", () => {
    const { container } = render(
      <ReadinessTrend
        selectedEstimateId="only"
        history={[
          {
            id: "only",
            estimateBasisPoints: 5000,
            lowerBasisPoints: 2000,
            upperBasisPoints: 8000,
            evidenceLevel: "LOW",
            evidenceCount: 0,
            createdAt: "2026-09-10T14:30:00.000Z",
          },
        ]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
