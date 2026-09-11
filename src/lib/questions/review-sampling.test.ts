import { describe, expect, it } from "vitest";

import {
  buildDeterministicQualitySample,
  detectionProbability,
  type DeterministicReviewSampleCandidate,
  minimumSampleSizeForDetection,
  selectDeterministicReviewSample,
} from "./review-sampling";

const base: Omit<
  DeterministicReviewSampleCandidate,
  "versionId" | "generationTemplateKey" | "generationPromptHash"
> = {
  latestDecision: "UNREVIEWED",
  difficulty: "DEVELOPING",
  questionType: "NUMERIC",
  hasStimulus: false,
  generationProvider: "NuraPrep",
  generationModel: "deterministic/math.example/v1",
  generationTemplateVersion: 1,
};

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

  it("builds a stable union of template, detection, and risk samples", () => {
    const candidates = Array.from({ length: 100 }, (_, index) =>
      candidate(
        `version-${index}`,
        `math.example.${index % 10}`,
        index.toString(16).padStart(64, "0"),
      ),
    );
    candidates[11] = {
      ...candidates[11],
      difficulty: "ADVANCED",
      questionType: "ORDERED_RESPONSE",
    };

    const report = buildDeterministicQualitySample(candidates);
    const reversedReport = buildDeterministicQualitySample(
      [...candidates].reverse(),
    );

    expect(report.populationSize).toBe(100);
    expect(report.templateCount).toBe(10);
    expect(report.templateAnchorCount).toBe(10);
    expect(report.detectionSampleSize).toBeGreaterThan(0);
    expect(report.modeledDetectionProbability).toBeGreaterThanOrEqual(0.95);
    expect(report.riskTemplateCount).toBe(1);
    expect(report.riskSupplementCount).toBe(1);
    expect(report.riskVersionIds).toContain("version-11");
    expect(report.items.map((item) => item.versionId)).toEqual(
      reversedReport.items.map((item) => item.versionId),
    );
    expect(
      new Set(
        report.items.map(
          (item) =>
            `${item.generationTemplateKey}@${item.generationTemplateVersion}`,
        ),
      ).size,
    ).toBe(10);
  });

  it("includes invalid-hash candidates for direct inspection", () => {
    const missingHash = candidate(
      "missing-hash",
      "math.example.a",
      "not-a-hash",
    );
    const report = buildDeterministicQualitySample([
      missingHash,
      candidate("valid", "math.example.b", "a".repeat(64)),
    ]);

    expect(report.missingHashCount).toBe(1);
    expect(report.items).toContain(missingHash);
    expect(report.hashEligiblePopulationSize).toBe(1);
  });

  it("finds the smallest finite-population detection sample", () => {
    const sampleSize = minimumSampleSizeForDetection({
      populationSize: 432,
      assumedDefectRate: 0.05,
      targetConfidence: 0.95,
    });

    expect(
      detectionProbability({
        populationSize: 432,
        sampleSize,
        assumedDefectRate: 0.05,
      }),
    ).toBeGreaterThanOrEqual(0.95);
    expect(
      detectionProbability({
        populationSize: 432,
        sampleSize: sampleSize - 1,
        assumedDefectRate: 0.05,
      }),
    ).toBeLessThan(0.95);
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
