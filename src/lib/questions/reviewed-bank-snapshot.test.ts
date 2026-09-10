import { describe, expect, it } from "vitest";

import reviewedMathBank from "@/content/reviewed-math-bank.json";

import { reviewedMathBankSnapshotSchema } from "./reviewed-bank-snapshot";
import {
  validateMathVerification,
  validateMisconceptionRules,
  validateQuestionContent,
} from "./validation";

describe("reviewed Math bank snapshot", () => {
  it("contains 38 unique owner-approved, deterministically valid families", () => {
    const snapshot = reviewedMathBankSnapshotSchema.parse(reviewedMathBank);

    expect(snapshot.questions).toHaveLength(38);
    expect(
      snapshot.questions.every((question) => {
        const content = validateQuestionContent(question.content);
        return (
          content.valid &&
          validateMathVerification(question.content, question.verificationSpec)
            .valid &&
          validateMisconceptionRules(
            question.content,
            question.commonMisconceptions,
            question.misconceptionRules,
          ).length === 0
        );
      }),
    ).toBe(true);
  });

  it("records only governed high-level source links", () => {
    const snapshot = reviewedMathBankSnapshotSchema.parse(reviewedMathBank);

    expect(
      snapshot.questions.every(
        (question) =>
          question.sources.length > 0 &&
          question.sources.every(
            (source) =>
              source.relationship === "SPECIFICATION" &&
              source.canonicalUrl.startsWith("https://www.atitesting.com/"),
          ),
      ),
    ).toBe(true);
  });
});
