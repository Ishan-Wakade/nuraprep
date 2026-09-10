import { describe, expect, it } from "vitest";

import { selectDeterministicReviewSample } from "./review-sampling";

const base = {
  latestDecision: "UNREVIEWED",
  generationProvider: "NuraPrep",
  generationModel: "deterministic/math.example/v1",
  generationTemplateVersion: 1,
} as const;

describe("deterministic review sampling", () => {
  it("selects the lowest stable prompt hash once per template", () => {
    const candidates = [
      candidate("a-later", "math.example.a", "f0"),
      candidate("b-only", "math.example.b", "c0"),
      candidate("a-selected", "math.example.a", "a0"),
    ];

    expect(selectDeterministicReviewSample(candidates)).toEqual([
      candidates[2],
      candidates[1],
    ]);
    expect(selectDeterministicReviewSample([...candidates].reverse())).toEqual([
      candidates[2],
      candidates[1],
    ]);
  });

  it("excludes reviewed, external, and non-deterministic candidates", () => {
    const eligible = candidate("eligible", "math.example.a", "a0");
    expect(
      selectDeterministicReviewSample([
        eligible,
        {
          ...candidate("approved", "math.example.b", "b0"),
          latestDecision: "APPROVED",
        },
        {
          ...candidate("external", "math.example.c", "c0"),
          generationProvider: "External",
        },
        {
          ...candidate("model", "math.example.d", "d0"),
          generationModel: "gpt-example",
        },
        {
          ...candidate("missing", "math.example.e", "e0"),
          generationTemplateKey: null,
        },
      ]),
    ).toEqual([eligible]);
  });

  it("treats template versions as separate review strata", () => {
    const first = candidate("v1", "math.example.a", "b0");
    const second = {
      ...candidate("v2", "math.example.a", "a0"),
      generationTemplateVersion: 2,
    };

    expect(selectDeterministicReviewSample([second, first])).toEqual([
      first,
      second,
    ]);
  });
});

function candidate(
  versionId: string,
  generationTemplateKey: string,
  generationPromptHash: string,
) {
  return {
    ...base,
    versionId,
    generationTemplateKey,
    generationPromptHash,
  };
}
