export const DIFFICULTY_RUBRIC_VERSION = 2;

export const INTERNAL_DIFFICULTY_RUBRIC = {
  FOUNDATIONAL: {
    label: "Foundational",
    summary:
      "One explicit operation, conversion, or fact with familiar notation and little interpretation.",
  },
  DEVELOPING: {
    label: "Developing",
    summary:
      "One or two linked decisions, such as choosing an operation, translating a direct context, or reading a simple display.",
  },
  PROFICIENT: {
    label: "Proficient",
    summary:
      "A multi-step setup, combined concepts, or a less-direct representation where the method is not stated for the learner.",
  },
  ADVANCED: {
    label: "Advanced",
    summary:
      "Several linked decisions, non-routine constraints, or transfer across representations; not merely larger numbers.",
  },
} as const;

export const EXPLANATION_RUBRIC_VERSION = 2;

export const EXPLANATION_RUBRIC = [
  "Name or describe the underlying idea in learner-friendly language.",
  "Show why the setup or operation fits the question.",
  "Carry out the calculation in readable steps.",
  "Interpret or check the result in the original context when applicable.",
  "Address the most likely misconception without simply repeating the answer.",
] as const;

export const REVIEW_SCORE_RUBRIC = {
  1: "Serious error or unsafe to publish",
  2: "Material revision required",
  3: "Acceptable for this criterion",
  4: "Strong, clear evidence",
} as const;
