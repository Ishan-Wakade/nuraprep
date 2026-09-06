"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import {
  coverageObservations,
  skills,
  sourceArtifacts,
  sourcePolicyReviews,
  type SourcePolicySnapshot,
} from "@/db/schema";
import { requireReviewer } from "@/lib/auth/reviewer";
import {
  deriveSourcePermissions,
  normalizeCanonicalUrl,
  sourcePolicyReviewSchema,
  sourceRegistrationSchema,
} from "@/lib/content/source-policy";

export type GovernanceActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const coverageObservationSchema = z.object({
  sourceArtifactId: z.uuid(),
  skillId: z.uuid(),
  observation: z.string().trim().min(20).max(5_000),
  abstractOnlyAttestation: z.literal("on"),
});

export async function registerSource(
  _previous: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const reviewer = requireReviewer();
  const parsed = sourceRegistrationSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid source record.",
    };
  }

  const permissions = deriveSourcePermissions(parsed.data.decision);
  const database = getDatabase();
  const reviewedAt = new Date();
  const recheckAt = parsed.data.recheckAt
    ? new Date(parsed.data.recheckAt)
    : null;
  const created = await database.transaction(async (transaction) => {
    const [source] = await transaction
      .insert(sourceArtifacts)
      .values({
        canonicalUrl: normalizeCanonicalUrl(parsed.data.canonicalUrl),
        publisher: parsed.data.publisher,
        title: parsed.data.title,
        artifactType: parsed.data.artifactType.toLocaleUpperCase("en-US"),
        accessedAt: reviewedAt,
        statedLicense: parsed.data.statedLicense || null,
        termsUrl: parsed.data.termsUrl || null,
        robotsSummary: parsed.data.robotsSummary || null,
        accessClass: parsed.data.accessClass,
        decision: parsed.data.decision,
        ...permissions,
        decisionRationale: parsed.data.decisionRationale,
        reviewedBy: reviewer.id,
        recheckAt,
      })
      .onConflictDoNothing({ target: sourceArtifacts.canonicalUrl })
      .returning({ id: sourceArtifacts.id });

    if (source) {
      await transaction.insert(sourcePolicyReviews).values({
        sourceArtifactId: source.id,
        reviewKind: "INITIAL",
        previousPolicy: null,
        resultingPolicy: toPolicySnapshot({
          accessClass: parsed.data.accessClass,
          decision: parsed.data.decision,
          statedLicense: parsed.data.statedLicense || null,
          termsUrl: parsed.data.termsUrl || null,
          robotsSummary: parsed.data.robotsSummary || null,
          ...permissions,
          decisionRationale: parsed.data.decisionRationale,
          recheckAt,
        }),
        reviewedBy: reviewer.id,
        reviewedAt,
      });
    }
    return source;
  });

  if (!created) {
    return {
      status: "error",
      message: "That canonical URL is already registered.",
    };
  }

  revalidatePath("/review/sources");
  return {
    status: "success",
    message: "Source registered with policy-derived permissions.",
  };
}

export async function recheckSourcePolicy(
  _previous: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const reviewer = requireReviewer();
  const parsed = sourcePolicyReviewSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid source recheck.",
    };
  }

  const database = getDatabase();
  const reviewedAt = new Date();
  const recheckAt = new Date(parsed.data.nextRecheckAt);
  const permissions = deriveSourcePermissions(parsed.data.decision);
  const nextPolicy = {
    accessClass: parsed.data.accessClass,
    decision: parsed.data.decision,
    statedLicense: parsed.data.statedLicense || null,
    termsUrl: parsed.data.termsUrl || null,
    robotsSummary: parsed.data.robotsSummary || null,
    ...permissions,
    decisionRationale: parsed.data.decisionRationale,
    recheckAt,
  };

  const updated = await database.transaction(async (transaction) => {
    const [current] = await transaction
      .select({
        accessClass: sourceArtifacts.accessClass,
        decision: sourceArtifacts.decision,
        statedLicense: sourceArtifacts.statedLicense,
        termsUrl: sourceArtifacts.termsUrl,
        robotsSummary: sourceArtifacts.robotsSummary,
        allowMetadata: sourceArtifacts.allowMetadata,
        allowCoverageAnalysis: sourceArtifacts.allowCoverageAnalysis,
        allowQuotation: sourceArtifacts.allowQuotation,
        allowStorage: sourceArtifacts.allowStorage,
        allowModelInput: sourceArtifacts.allowModelInput,
        decisionRationale: sourceArtifacts.decisionRationale,
        recheckAt: sourceArtifacts.recheckAt,
      })
      .from(sourceArtifacts)
      .where(eq(sourceArtifacts.id, parsed.data.sourceArtifactId))
      .for("update")
      .limit(1);

    if (!current) return false;

    await transaction
      .update(sourceArtifacts)
      .set({
        ...nextPolicy,
        accessedAt: reviewedAt,
        reviewedBy: reviewer.id,
        updatedAt: reviewedAt,
      })
      .where(eq(sourceArtifacts.id, parsed.data.sourceArtifactId));
    await transaction.insert(sourcePolicyReviews).values({
      sourceArtifactId: parsed.data.sourceArtifactId,
      reviewKind: "RECHECK",
      previousPolicy: toPolicySnapshot(current),
      resultingPolicy: toPolicySnapshot(nextPolicy),
      reviewedBy: reviewer.id,
      reviewedAt,
    });
    return true;
  });

  if (!updated) {
    return { status: "error", message: "Source was not found." };
  }

  revalidatePath("/review/sources");
  return {
    status: "success",
    message: "Source policy rechecked with immutable audit evidence.",
  };
}

export async function recordCoverageObservation(
  _previous: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const reviewer = requireReviewer();
  const parsed = coverageObservationSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Invalid coverage observation.",
    };
  }

  const database = getDatabase();
  const [[source], [skill]] = await Promise.all([
    database
      .select({
        allowCoverageAnalysis: sourceArtifacts.allowCoverageAnalysis,
      })
      .from(sourceArtifacts)
      .where(eq(sourceArtifacts.id, parsed.data.sourceArtifactId))
      .limit(1),
    database
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.id, parsed.data.skillId))
      .limit(1),
  ]);
  if (!source || !skill) {
    return { status: "error", message: "Source or skill was not found." };
  }
  if (!source.allowCoverageAnalysis) {
    return {
      status: "error",
      message: "This source decision does not permit coverage analysis.",
    };
  }

  await database.insert(coverageObservations).values({
    sourceArtifactId: parsed.data.sourceArtifactId,
    skillId: parsed.data.skillId,
    observation: parsed.data.observation,
    abstractionMethod:
      "Human-authored abstract coverage note; reviewer attested that no source-question wording, values, choices, or distinctive structure was retained.",
    recordedBy: reviewer.id,
  });
  revalidatePath("/review/sources");
  return { status: "success", message: "Coverage observation recorded." };
}

function toPolicySnapshot(policy: {
  accessClass: SourcePolicySnapshot["accessClass"];
  decision: SourcePolicySnapshot["decision"];
  statedLicense: string | null;
  termsUrl: string | null;
  robotsSummary: string | null;
  allowMetadata: boolean;
  allowCoverageAnalysis: boolean;
  allowQuotation: boolean;
  allowStorage: boolean;
  allowModelInput: boolean;
  decisionRationale: string;
  recheckAt: Date | null;
}): SourcePolicySnapshot {
  return {
    ...policy,
    recheckAt: policy.recheckAt?.toISOString() ?? null,
  };
}
