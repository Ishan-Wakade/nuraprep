import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnswerForm } from "./answer-form";

vi.mock("../actions", () => ({
  submitPracticeAnswer: vi.fn(),
}));

describe("AnswerForm", () => {
  it("keeps semantic choice identifiers internal", () => {
    render(
      <AnswerForm
        sessionId="session-1"
        sessionItemId="item-1"
        questionType="SINGLE_CHOICE"
        unitRequired={false}
        choices={[
          { id: "misconception", content: "3" },
          { id: "nearby", content: "6" },
          { id: "operation-error", content: "17" },
          { id: "correct", content: "7" },
        ]}
      />,
    );

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.queryByText("MISCONCEPTION")).not.toBeInTheDocument();
    expect(screen.queryByText("CORRECT")).not.toBeInTheDocument();
  });
});
