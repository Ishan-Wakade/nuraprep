ALTER TABLE "improvement_proposal_evidence" ADD COLUMN "source_kind" varchar(20);--> statement-breakpoint
ALTER TABLE "improvement_proposal_evidence" ADD COLUMN "question_version_id" uuid;--> statement-breakpoint
ALTER TABLE "improvement_proposal_evidence" ADD COLUMN "details_snapshot" text;--> statement-breakpoint
ALTER TABLE "improvement_proposal_evidence" DISABLE TRIGGER "improvement_proposal_evidence_is_append_only";--> statement-breakpoint
UPDATE "improvement_proposal_evidence" AS evidence
SET
  "source_kind" = CASE
    WHEN evidence."reviewer_feedback_id" IS NOT NULL THEN 'REVIEWER'
    ELSE 'LEARNER'
  END,
  "question_version_id" = COALESCE(
    (SELECT feedback."question_version_id" FROM "reviewer_feedback" AS feedback WHERE feedback."id" = evidence."reviewer_feedback_id"),
    (SELECT report."question_version_id" FROM "learner_question_reports" AS report WHERE report."id" = evidence."learner_report_id")
  ),
  "details_snapshot" = COALESCE(
    (SELECT feedback."feedback" FROM "reviewer_feedback" AS feedback WHERE feedback."id" = evidence."reviewer_feedback_id"),
    (SELECT report."details" FROM "learner_question_reports" AS report WHERE report."id" = evidence."learner_report_id")
  );--> statement-breakpoint
ALTER TABLE "improvement_proposal_evidence" ENABLE TRIGGER "improvement_proposal_evidence_is_append_only";--> statement-breakpoint
ALTER TABLE "improvement_proposal_evidence" ALTER COLUMN "source_kind" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "improvement_proposal_evidence" ALTER COLUMN "question_version_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "improvement_proposal_evidence" ALTER COLUMN "details_snapshot" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "improvement_proposal_evidence" ADD CONSTRAINT "improvement_proposal_evidence_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "improvement_evidence_question_idx" ON "improvement_proposal_evidence" USING btree ("question_version_id");--> statement-breakpoint
ALTER TABLE "improvement_proposal_evidence" ADD CONSTRAINT "improvement_evidence_snapshot_check" CHECK ("improvement_proposal_evidence"."source_kind" IN ('LEARNER', 'REVIEWER') AND length("improvement_proposal_evidence"."details_snapshot") >= 5);
