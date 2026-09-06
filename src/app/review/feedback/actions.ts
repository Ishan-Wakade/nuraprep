"use server";

import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDatabase } from "@/db/client";
import {
  improvementProposalDecisions,
  improvementProposalEvidence,
  improvementProposals,
  learnerQuestionReportEvents,
  learnerQuestionReports,
  reviewerFeedback,
} from "@/db/schema";
import { requireReviewer } from "@/lib/auth/reviewer";
import {
  createImprovementProposalKey,
  improvementDecisionSchema,
  improvementProposalSchema,
} from "@/lib/content/improvement";

export type ImprovementActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export async function createImprovementProposal(
  _previous: ImprovementActionState,
  formData: FormData,
): Promise<ImprovementActionState> {
  const reviewer = requireReviewer();
  const parsed = improvementProposalSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid proposal.",
    };
  }

  const input = parsed.data;
  const proposalKey = createImprovementProposalKey(input);

  const database = getDatabase();
  const result = await database.transaction(async (transaction) => {
    const reviewerRows = await transaction
      .select({
        id: reviewerFeedback.id,
        questionVersionId: reviewerFeedback.questionVersionId,
        details: reviewerFeedback.feedback,
      })
      .from(reviewerFeedback)
      .where(
        and(
          eq(reviewerFeedback.category, input.category),
          eq(reviewerFeedback.status, "OPEN"),
          input.patternKey === input.category
            ? isNull(reviewerFeedback.recurringIssueCode)
            : eq(reviewerFeedback.recurringIssueCode, input.patternKey),
        ),
      )
      .orderBy(desc(reviewerFeedback.createdAt))
      .limit(200);

    let openLearnerRows: {
      id: string;
      questionVersionId: string;
      details: string;
    }[] = [];
    if (input.patternKey === input.category) {
      const learnerRows = await transaction
        .select({
          id: learnerQuestionReports.id,
          questionVersionId: learnerQuestionReports.questionVersionId,
          details: learnerQuestionReports.details,
        })
        .from(learnerQuestionReports)
        .where(eq(learnerQuestionReports.category, input.category))
        .orderBy(desc(learnerQuestionReports.createdAt))
        .limit(200);
      const events = learnerRows.length
        ? await transaction
            .select({
              reportId: learnerQuestionReportEvents.reportId,
              status: learnerQuestionReportEvents.status,
            })
            .from(learnerQuestionReportEvents)
            .where(
              inArray(
                learnerQuestionReportEvents.reportId,
                learnerRows.map((row) => row.id),
              ),
            )
            .orderBy(
              desc(learnerQuestionReportEvents.createdAt),
              desc(learnerQuestionReportEvents.id),
            )
        : [];
      const latestStatus = new Map<string, (typeof events)[number]["status"]>();
      for (const event of events) {
        if (!latestStatus.has(event.reportId)) {
          latestStatus.set(event.reportId, event.status);
        }
      }
      openLearnerRows = learnerRows.filter(
        (row) => (latestStatus.get(row.id) ?? "OPEN") === "OPEN",
      );
    }

    const evidenceCount = reviewerRows.length + openLearnerRows.length;
    if (evidenceCount < 2) {
      return { outcome: "INSUFFICIENT" as const, evidenceCount };
    }

    const [created] = await transaction
      .insert(improvementProposals)
      .values({
        proposalKey,
        patternKey: input.patternKey,
        category: input.category,
        target: input.target,
        title: input.title,
        problemSummary: input.problemSummary,
        proposedChange: input.proposedChange,
        regressionPlan: input.regressionPlan,
        createdBy: reviewer.id,
      })
      .onConflictDoNothing({ target: improvementProposals.proposalKey })
      .returning({ id: improvementProposals.id });
    if (!created) {
      return { outcome: "DUPLICATE" as const, evidenceCount };
    }

    await transaction.insert(improvementProposalEvidence).values([
      ...reviewerRows.map((row) => ({
        proposalId: created.id,
        evidenceKey: `REVIEWER:${row.id}`,
        sourceKind: "REVIEWER",
        questionVersionId: row.questionVersionId,
        detailsSnapshot: row.details,
        reviewerFeedbackId: row.id,
      })),
      ...openLearnerRows.map((row) => ({
        proposalId: created.id,
        evidenceKey: `LEARNER:${row.id}`,
        sourceKind: "LEARNER",
        questionVersionId: row.questionVersionId,
        detailsSnapshot: row.details,
        learnerReportId: row.id,
      })),
    ]);
    return { outcome: "CREATED" as const, evidenceCount };
  });

  if (result.outcome === "INSUFFICIENT") {
    return {
      status: "error",
      message: `At least two matching open signals are required; found ${result.evidenceCount}.`,
    };
  }

  revalidatePath("/review/feedback");
  return result.outcome === "DUPLICATE"
    ? {
        status: "success",
        message: "An identical evidence-backed proposal already exists.",
      }
    : {
        status: "success",
        message: `Draft proposal created with ${result.evidenceCount} immutable evidence links. No template or rule was changed.`,
      };
}

export async function decideImprovementProposal(
  _previous: ImprovementActionState,
  formData: FormData,
): Promise<ImprovementActionState> {
  const reviewer = requireReviewer();
  const parsed = improvementDecisionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid decision.",
    };
  }

  const database = getDatabase();
  const [proposal] = await database
    .select({
      id: improvementProposals.id,
      evidenceCount: count(improvementProposalEvidence.id),
    })
    .from(improvementProposals)
    .leftJoin(
      improvementProposalEvidence,
      eq(improvementProposalEvidence.proposalId, improvementProposals.id),
    )
    .where(eq(improvementProposals.id, parsed.data.proposalId))
    .groupBy(improvementProposals.id)
    .limit(1);
  if (!proposal) {
    return { status: "error", message: "Improvement proposal not found." };
  }
  if (proposal.evidenceCount < 2) {
    return {
      status: "error",
      message: "At least two immutable evidence links are required.",
    };
  }

  const [created] = await database
    .insert(improvementProposalDecisions)
    .values({
      proposalId: parsed.data.proposalId,
      decision: parsed.data.decision,
      notes: parsed.data.notes,
      decidedBy: reviewer.id,
    })
    .onConflictDoNothing({
      target: improvementProposalDecisions.proposalId,
    })
    .returning({ id: improvementProposalDecisions.id });

  if (!created) {
    return {
      status: "error",
      message: "This proposal already has a final decision.",
    };
  }

  revalidatePath("/review/feedback");
  return {
    status: "success",
    message:
      parsed.data.decision === "APPROVED"
        ? "Proposal approved as a plan only. Implementation remains a separate reviewed change."
        : "Proposal rejected with immutable decision notes.",
  };
}
