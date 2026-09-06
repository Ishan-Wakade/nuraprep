import { z } from "zod";

export const sourceAccessValues = [
  "PUBLIC",
  "OPEN_LICENSED",
  "ACCOUNT_GATED",
  "PAID",
  "USER_SUBMITTED",
] as const;

export const sourceDecisionValues = [
  "METADATA_ONLY",
  "COVERAGE_ANALYSIS",
  "LICENSED_STORAGE",
  "EXCLUDED",
  "QUARANTINED",
] as const;

export const sourceRegistrationSchema = z
  .object({
    canonicalUrl: z.url().trim().max(2_000),
    publisher: z.string().trim().min(2).max(240),
    title: z.string().trim().min(2).max(500),
    artifactType: z.string().trim().min(2).max(80),
    accessClass: z.enum(sourceAccessValues),
    decision: z.enum(sourceDecisionValues),
    statedLicense: z.string().trim().max(2_000).optional(),
    termsUrl: z.union([z.url().trim().max(2_000), z.literal("")]).optional(),
    robotsSummary: z.string().trim().max(5_000).optional(),
    decisionRationale: z.string().trim().min(20).max(10_000),
    recheckAt: z
      .union([z.iso.datetime(), z.iso.date(), z.literal("")])
      .optional(),
  })
  .superRefine((source, context) => {
    const url = new URL(source.canonicalUrl);
    if (url.protocol !== "https:") {
      context.addIssue({
        code: "custom",
        path: ["canonicalUrl"],
        message: "Source URLs must use HTTPS.",
      });
    }
    if (url.username || url.password) {
      context.addIssue({
        code: "custom",
        path: ["canonicalUrl"],
        message: "Source URLs must not contain embedded credentials.",
      });
    }
    if (source.termsUrl && new URL(source.termsUrl).protocol !== "https:") {
      context.addIssue({
        code: "custom",
        path: ["termsUrl"],
        message: "Terms URLs must use HTTPS.",
      });
    }

    if (source.decision === "LICENSED_STORAGE") {
      if (!source.statedLicense) {
        context.addIssue({
          code: "custom",
          path: ["statedLicense"],
          message:
            "Licensed storage requires a recorded license or permission.",
        });
      }
      if (!source.termsUrl) {
        context.addIssue({
          code: "custom",
          path: ["termsUrl"],
          message: "Licensed storage requires the reviewed terms URL.",
        });
      }
    }

    if (
      ["ACCOUNT_GATED", "PAID", "USER_SUBMITTED"].includes(
        source.accessClass,
      ) &&
      !["LICENSED_STORAGE", "EXCLUDED", "QUARANTINED"].includes(source.decision)
    ) {
      context.addIssue({
        code: "custom",
        path: ["decision"],
        message:
          "Gated, paid, and user-submitted sources must be excluded, quarantined, or supported by recorded permission.",
      });
    }
  });

export const sourcePolicyReviewSchema = z
  .object({
    sourceArtifactId: z.uuid(),
    accessClass: z.enum(sourceAccessValues),
    decision: z.enum(sourceDecisionValues),
    statedLicense: z.string().trim().max(2_000).optional(),
    termsUrl: z.union([z.url().trim().max(2_000), z.literal("")]).optional(),
    robotsSummary: z.string().trim().max(5_000).optional(),
    decisionRationale: z.string().trim().min(20).max(10_000),
    nextRecheckAt: z.iso.date(),
    rightsEvidenceAttestation: z.literal("on"),
  })
  .superRefine((source, context) => {
    if (source.termsUrl && new URL(source.termsUrl).protocol !== "https:") {
      context.addIssue({
        code: "custom",
        path: ["termsUrl"],
        message: "Terms URLs must use HTTPS.",
      });
    }

    if (source.decision === "LICENSED_STORAGE") {
      if (!source.statedLicense) {
        context.addIssue({
          code: "custom",
          path: ["statedLicense"],
          message:
            "Licensed storage requires a recorded license or permission.",
        });
      }
      if (!source.termsUrl) {
        context.addIssue({
          code: "custom",
          path: ["termsUrl"],
          message: "Licensed storage requires the reviewed terms URL.",
        });
      }
    }

    if (
      ["ACCOUNT_GATED", "PAID", "USER_SUBMITTED"].includes(
        source.accessClass,
      ) &&
      !["LICENSED_STORAGE", "EXCLUDED", "QUARANTINED"].includes(source.decision)
    ) {
      context.addIssue({
        code: "custom",
        path: ["decision"],
        message:
          "Gated, paid, and user-submitted sources must be excluded, quarantined, or supported by recorded permission.",
      });
    }

    const nextRecheck = new Date(`${source.nextRecheckAt}T00:00:00.000Z`);
    if (nextRecheck.getTime() <= Date.now()) {
      context.addIssue({
        code: "custom",
        path: ["nextRecheckAt"],
        message: "The next recheck date cannot be in the past.",
      });
    }
  });

export type SourceRegistration = z.infer<typeof sourceRegistrationSchema>;
export type SourcePolicyReview = z.infer<typeof sourcePolicyReviewSchema>;

export type SourcePermissions = {
  allowMetadata: boolean;
  allowCoverageAnalysis: boolean;
  allowQuotation: boolean;
  allowStorage: boolean;
  allowModelInput: boolean;
};

export function deriveSourcePermissions(
  decision: SourceRegistration["decision"],
): SourcePermissions {
  switch (decision) {
    case "METADATA_ONLY":
      return {
        allowMetadata: true,
        allowCoverageAnalysis: false,
        allowQuotation: false,
        allowStorage: false,
        allowModelInput: false,
      };
    case "COVERAGE_ANALYSIS":
      return {
        allowMetadata: true,
        allowCoverageAnalysis: true,
        allowQuotation: false,
        allowStorage: false,
        allowModelInput: false,
      };
    case "LICENSED_STORAGE":
      return {
        allowMetadata: true,
        allowCoverageAnalysis: true,
        allowQuotation: false,
        allowStorage: true,
        allowModelInput: false,
      };
    case "QUARANTINED":
      return {
        allowMetadata: true,
        allowCoverageAnalysis: false,
        allowQuotation: false,
        allowStorage: false,
        allowModelInput: false,
      };
    case "EXCLUDED":
      return {
        allowMetadata: false,
        allowCoverageAnalysis: false,
        allowQuotation: false,
        allowStorage: false,
        allowModelInput: false,
      };
  }
}

export function normalizeCanonicalUrl(value: string) {
  const url = new URL(value.trim());
  url.hash = "";
  url.hostname = url.hostname.toLocaleLowerCase("en-US");
  return url.toString();
}
