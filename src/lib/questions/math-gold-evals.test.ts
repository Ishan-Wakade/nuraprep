import { describe, expect, it } from "vitest";

import { mathGoldEvaluationCases } from "./math-gold-evals";
import {
  validateMathVerification,
  validateQuestionContent,
} from "./validation";

const expectedSkillCodes = [
  "MATH.ARITHMETIC",
  "MATH.FRACTIONS_DECIMALS_PERCENT",
  "MATH.RATIOS_PROPORTIONS",
  "MATH.UNIT_CONVERSIONS",
  "MATH.ALGEBRAIC_EXPRESSIONS",
  "MATH.LINEAR_EQUATIONS",
  "MATH.INEQUALITIES",
  "MATH.WORD_PROBLEMS",
  "MATH.MEASUREMENT",
  "MATH.GEOMETRY",
  "MATH.DATA_INTERPRETATION",
  "MATH.PROBABILITY_STATISTICS",
];

describe("Math engineering gold evaluation set", () => {
  it("contains one uniquely identified draft case for every Math leaf skill", () => {
    expect(
      mathGoldEvaluationCases.map((item) => item.skillCode).sort(),
    ).toEqual(expectedSkillCodes.sort());
    expect(new Set(mathGoldEvaluationCases.map((item) => item.id)).size).toBe(
      mathGoldEvaluationCases.length,
    );
    expect(
      mathGoldEvaluationCases.every(
        (item) => item.reviewStatus === "ENGINEERING_DRAFT",
      ),
    ).toBe(true);
  });

  it.each(mathGoldEvaluationCases)(
    "$id passes the deterministic content and math contracts",
    (evaluationCase) => {
      const content = validateQuestionContent(evaluationCase.content);
      expect(content.valid).toBe(true);
      expect(
        validateMathVerification(
          evaluationCase.content,
          evaluationCase.verificationSpec,
        ),
      ).toMatchObject({ valid: true });
    },
  );
});
