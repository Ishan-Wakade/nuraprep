"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ensureLearnerProfile } from "@/data/practice";
import { calculateLearnerScoreEstimate } from "@/data/score";
import { getDatabase } from "@/db/client";
import {
  learnerProfiles,
  scoreEstimates,
  studyPlanItems,
  studyPlans,
} from "@/db/schema";
import { requireLearner } from "@/lib/auth/learner";
import { STUDY_PLAN_MODEL_VERSION } from "@/lib/score/estimator";

export type ScoreActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function generateScoreEstimate(
  _previousState: ScoreActionState,
  _formData: FormData,
): Promise<ScoreActionState> {
  void _previousState;
  void _formData;
  const identity = await requireLearner();
  const learner = await ensureLearnerProfile(identity);
  const { result, skillIds } = await calculateLearnerScoreEstimate(learner.id);
  const database = getDatabase();

  const estimateId = await database.transaction(async (transaction) => {
    const [estimate] = await transaction
      .insert(scoreEstimates)
      .values({
        learnerId: learner.id,
        modelVersion: result.modelVersion,
        estimateBasisPoints: toBasisPoints(result.estimate),
        lowerBasisPoints: toBasisPoints(result.lowerBound),
        upperBasisPoints: toBasisPoints(result.upperBound),
        evidenceLevel: result.evidenceLevel,
        evidenceCount: result.evidenceCount,
        effectiveEvidenceMilli: Math.round(result.effectiveEvidence * 1_000),
        featureSnapshot: result.features,
        caveats: result.caveats,
      })
      .returning({ id: scoreEstimates.id });
    if (!estimate) throw new Error("Failed to save the score estimate.");

    const [plan] = await transaction
      .insert(studyPlans)
      .values({
        learnerId: learner.id,
        scoreEstimateId: estimate.id,
        modelVersion: STUDY_PLAN_MODEL_VERSION,
        weeklyMinutes: Math.max(
          30,
          result.studyPlan.reduce(
            (total, item) => total + item.targetMinutes,
            0,
          ),
        ),
      })
      .returning({ id: studyPlans.id });
    if (!plan) throw new Error("Failed to save the study plan.");

    const planItems = result.studyPlan.flatMap((item) => {
      const skillId = skillIds.get(item.skillCode);
      return skillId
        ? [
            {
              studyPlanId: plan.id,
              skillId,
              priority: item.priority,
              targetMinutes: item.targetMinutes,
              rationale: item.rationale,
            },
          ]
        : [];
    });
    if (planItems.length) {
      await transaction.insert(studyPlanItems).values(planItems);
    }
    return estimate.id;
  });

  redirect(`/practice/progress?estimate=${estimateId}`);
}

const itemUpdateSchema = z.object({
  itemId: z.uuid(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "SKIPPED"]),
  targetMinutes: z.coerce.number().int().min(10).max(600),
});

export async function updateStudyPlanItem(
  _previousState: ScoreActionState,
  formData: FormData,
): Promise<ScoreActionState> {
  void _previousState;
  const identity = await requireLearner();
  const parsed = itemUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Choose a valid plan status and time." };
  }
  const database = getDatabase();
  const [owned] = await database
    .select({ id: studyPlanItems.id })
    .from(studyPlanItems)
    .innerJoin(studyPlans, eq(studyPlans.id, studyPlanItems.studyPlanId))
    .innerJoin(learnerProfiles, eq(learnerProfiles.id, studyPlans.learnerId))
    .where(
      and(
        eq(studyPlanItems.id, parsed.data.itemId),
        eq(learnerProfiles.authSubject, identity.subject),
      ),
    )
    .limit(1);
  if (!owned) return { status: "error", message: "Study-plan item not found." };

  await database
    .update(studyPlanItems)
    .set({
      status: parsed.data.status,
      targetMinutes: parsed.data.targetMinutes,
      updatedAt: new Date(),
    })
    .where(eq(studyPlanItems.id, owned.id));
  revalidatePath("/practice/progress");
  return { status: "success", message: "Study-plan item updated." };
}

const planUpdateSchema = z.object({
  planId: z.uuid(),
  weeklyMinutes: z.coerce.number().int().min(30).max(1_200),
  learnerNotes: z.string().trim().max(2_000),
});

export async function updateStudyPlan(
  _previousState: ScoreActionState,
  formData: FormData,
): Promise<ScoreActionState> {
  void _previousState;
  const identity = await requireLearner();
  const parsed = planUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Enter valid plan preferences." };
  }
  const database = getDatabase();
  const [owned] = await database
    .select({ id: studyPlans.id })
    .from(studyPlans)
    .innerJoin(learnerProfiles, eq(learnerProfiles.id, studyPlans.learnerId))
    .where(
      and(
        eq(studyPlans.id, parsed.data.planId),
        eq(learnerProfiles.authSubject, identity.subject),
      ),
    )
    .limit(1);
  if (!owned) return { status: "error", message: "Study plan not found." };

  await database
    .update(studyPlans)
    .set({
      weeklyMinutes: parsed.data.weeklyMinutes,
      learnerNotes: parsed.data.learnerNotes || null,
      updatedAt: new Date(),
    })
    .where(eq(studyPlans.id, owned.id));
  revalidatePath("/practice/progress");
  return { status: "success", message: "Study-plan preferences updated." };
}

function toBasisPoints(value: number) {
  return Math.max(0, Math.min(10_000, Math.round(value * 10_000)));
}
