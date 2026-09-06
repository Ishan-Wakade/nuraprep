import { describe, expect, it } from "vitest";

import {
  deriveSourcePermissions,
  normalizeCanonicalUrl,
  sourcePolicyReviewSchema,
  sourceRegistrationSchema,
} from "./source-policy";

const publicSource = {
  canonicalUrl: "https://example.org/math-outline",
  publisher: "Example publisher",
  title: "Public math outline",
  artifactType: "CONTENT_OUTLINE",
  accessClass: "PUBLIC" as const,
  decision: "COVERAGE_ANALYSIS" as const,
  decisionRationale:
    "Use only a human-authored abstraction of high-level topic coverage.",
};

describe("source intake policy", () => {
  it("keeps coverage-only sources out of storage and model input", () => {
    expect(deriveSourcePermissions("COVERAGE_ANALYSIS")).toEqual({
      allowMetadata: true,
      allowCoverageAnalysis: true,
      allowQuotation: false,
      allowStorage: false,
      allowModelInput: false,
    });
  });

  it("requires explicit license evidence before storage", () => {
    const result = sourceRegistrationSchema.safeParse({
      ...publicSource,
      accessClass: "OPEN_LICENSED",
      decision: "LICENSED_STORAGE",
    });
    expect(result.success).toBe(false);
  });

  it("does not infer quotation or model-input rights from storage rights", () => {
    expect(deriveSourcePermissions("LICENSED_STORAGE")).toMatchObject({
      allowStorage: true,
      allowQuotation: false,
      allowModelInput: false,
    });
  });

  it("fails closed for paid sources without recorded permission", () => {
    const result = sourceRegistrationSchema.safeParse({
      ...publicSource,
      accessClass: "PAID",
    });
    expect(result.success).toBe(false);
  });

  it("accepts quarantined user submissions without analysis rights", () => {
    const result = sourceRegistrationSchema.safeParse({
      ...publicSource,
      accessClass: "USER_SUBMITTED",
      decision: "QUARANTINED",
    });
    expect(result.success).toBe(true);
    expect(deriveSourcePermissions("QUARANTINED").allowModelInput).toBe(false);
  });

  it("normalizes host casing and strips URL fragments", () => {
    expect(
      normalizeCanonicalUrl("https://EXAMPLE.org/outline?q=math#section"),
    ).toBe("https://example.org/outline?q=math");
  });

  it("requires future-dated rechecks and reapplies fail-closed rights rules", () => {
    const baseReview = {
      sourceArtifactId: "00000000-0000-4000-8000-000000000001",
      accessClass: "PUBLIC" as const,
      decision: "COVERAGE_ANALYSIS" as const,
      decisionRationale:
        "The reviewer confirmed that only abstract topic coverage may be retained.",
      nextRecheckAt: "2099-01-01",
      rightsEvidenceAttestation: "on" as const,
    };

    expect(sourcePolicyReviewSchema.safeParse(baseReview).success).toBe(true);
    expect(
      sourcePolicyReviewSchema.safeParse({
        ...baseReview,
        nextRecheckAt: "2020-01-01",
      }).success,
    ).toBe(false);
    expect(
      sourcePolicyReviewSchema.safeParse({
        ...baseReview,
        accessClass: "OPEN_LICENSED",
        decision: "LICENSED_STORAGE",
      }).success,
    ).toBe(false);
  });
});
