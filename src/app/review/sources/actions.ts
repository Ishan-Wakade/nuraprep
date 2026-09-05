"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { coverageObservations, skills, sourceArtifacts } from "@/db/schema";
import { requireReviewer } from "@/lib/auth/reviewer";
import {
  deriveSourcePermissions,
  normalizeCanonicalUrl,
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
  const [created] = await database
    .insert(sourceArtifacts)
    .values({
      canonicalUrl: normalizeCanonicalUrl(parsed.data.canonicalUrl),
      publisher: parsed.data.publisher,
      title: parsed.data.title,
      artifactType: parsed.data.artifactType.toLocaleUpperCase("en-US"),
      accessedAt: new Date(),
      statedLicense: parsed.data.statedLicense || null,
      termsUrl: parsed.data.termsUrl || null,
      robotsSummary: parsed.data.robotsSummary || null,
      accessClass: parsed.data.accessClass,
      decision: parsed.data.decision,
      ...permissions,
      decisionRationale: parsed.data.decisionRationale,
      reviewedBy: reviewer.id,
      recheckAt: parsed.data.recheckAt ? new Date(parsed.data.recheckAt) : null,
    })
    .onConflictDoNothing({ target: sourceArtifacts.canonicalUrl })
    .returning({ id: sourceArtifacts.id });

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
