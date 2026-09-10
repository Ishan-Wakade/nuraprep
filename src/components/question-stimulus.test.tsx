import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuestionStimulus } from "./question-stimulus";

describe("QuestionStimulus", () => {
  it("renders a semantic data table", () => {
    render(
      <QuestionStimulus
        stimulus={{
          type: "table",
          caption: "Clinic appointments",
          columns: ["Day", "Appointments"],
          rows: [
            ["Monday", "12"],
            ["Tuesday", "15"],
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("table", { name: "Clinic appointments" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Day" })).toHaveAttribute(
      "scope",
      "col",
    );
  });

  it("renders a responsive SVG bar graph and an exact table alternative", () => {
    const { container } = render(
      <QuestionStimulus
        stimulus={{
          type: "graph",
          accessibleDescription:
            "A bar graph shows 12 visits on Monday and 18 on Tuesday.",
          data: {
            kind: "bar",
            title: "Visits by day",
            xAxisLabel: "Day",
            yAxisLabel: "Visits",
            bars: [
              { label: "Monday", value: 12 },
              { label: "Tuesday", value: 18 },
            ],
          },
        }}
      />,
    );

    expect(
      screen.getByRole("img", {
        name: "A bar graph shows 12 visits on Monday and 18 on Tuesday.",
      }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("svg rect")).toHaveLength(2);
    expect(screen.getByText("View graph data as a table")).toBeInTheDocument();
    const tableAlternative = screen
      .getByText("View graph data as a table")
      .closest("details");
    expect(tableAlternative).not.toBeNull();
    expect(
      within(tableAlternative as HTMLElement).getByRole("cell", {
        name: "Tuesday",
      }),
    ).toBeInTheDocument();
  });
});
