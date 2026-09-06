CREATE TYPE "public"."improvement_decision" AS ENUM('APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."improvement_target" AS ENUM('GENERATION_TEMPLATE', 'VALIDATOR_RULE', 'DIFFICULTY_RUBRIC', 'EVALUATION_CASE', 'CONTENT_POLICY');--> statement-breakpoint
CREATE TABLE "improvement_proposal_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"decision" "improvement_decision" NOT NULL,
	"notes" text NOT NULL,
	"decided_by" varchar(160) NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "improvement_proposal_decision_notes_check" CHECK (length("improvement_proposal_decisions"."notes") >= 20)
);
--> statement-breakpoint
CREATE TABLE "improvement_proposal_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"evidence_key" varchar(200) NOT NULL,
	"reviewer_feedback_id" uuid,
	"learner_report_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "improvement_evidence_exactly_one_source_check" CHECK (("improvement_proposal_evidence"."reviewer_feedback_id" IS NOT NULL AND "improvement_proposal_evidence"."learner_report_id" IS NULL) OR ("improvement_proposal_evidence"."reviewer_feedback_id" IS NULL AND "improvement_proposal_evidence"."learner_report_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "improvement_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_key" varchar(64) NOT NULL,
	"pattern_key" varchar(120) NOT NULL,
	"category" "feedback_category" NOT NULL,
	"target" "improvement_target" NOT NULL,
	"title" varchar(240) NOT NULL,
	"problem_summary" text NOT NULL,
	"proposed_change" text NOT NULL,
	"regression_plan" text NOT NULL,
	"created_by" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "improvement_proposal_content_check" CHECK (length("improvement_proposals"."problem_summary") >= 20 AND length("improvement_proposals"."proposed_change") >= 20 AND length("improvement_proposals"."regression_plan") >= 20)
);
--> statement-breakpoint
ALTER TABLE "improvement_proposal_decisions" ADD CONSTRAINT "improvement_proposal_decisions_proposal_id_improvement_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."improvement_proposals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "improvement_proposal_evidence" ADD CONSTRAINT "improvement_proposal_evidence_proposal_id_improvement_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."improvement_proposals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "improvement_proposal_evidence" ADD CONSTRAINT "improvement_proposal_evidence_reviewer_feedback_id_reviewer_feedback_id_fk" FOREIGN KEY ("reviewer_feedback_id") REFERENCES "public"."reviewer_feedback"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "improvement_proposal_evidence" ADD CONSTRAINT "improvement_proposal_evidence_learner_report_id_learner_question_reports_id_fk" FOREIGN KEY ("learner_report_id") REFERENCES "public"."learner_question_reports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "improvement_proposal_decision_idx" ON "improvement_proposal_decisions" USING btree ("proposal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "improvement_proposal_evidence_key_idx" ON "improvement_proposal_evidence" USING btree ("proposal_id","evidence_key");--> statement-breakpoint
CREATE INDEX "improvement_evidence_reviewer_idx" ON "improvement_proposal_evidence" USING btree ("reviewer_feedback_id");--> statement-breakpoint
CREATE INDEX "improvement_evidence_learner_idx" ON "improvement_proposal_evidence" USING btree ("learner_report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "improvement_proposal_key_idx" ON "improvement_proposals" USING btree ("proposal_key");--> statement-breakpoint
CREATE INDEX "improvement_proposal_pattern_idx" ON "improvement_proposals" USING btree ("pattern_key","category","created_at");--> statement-breakpoint

CREATE TRIGGER improvement_proposals_are_append_only
BEFORE UPDATE OR DELETE ON improvement_proposals
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();--> statement-breakpoint

CREATE TRIGGER improvement_proposal_evidence_is_append_only
BEFORE UPDATE OR DELETE ON improvement_proposal_evidence
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();--> statement-breakpoint

CREATE TRIGGER improvement_proposal_decisions_are_append_only
BEFORE UPDATE OR DELETE ON improvement_proposal_decisions
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();--> statement-breakpoint

CREATE OR REPLACE FUNCTION require_improvement_proposal_evidence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    SELECT count(*)
    FROM improvement_proposal_evidence
    WHERE proposal_id = NEW.proposal_id
  ) < 2 THEN
    RAISE EXCEPTION 'improvement proposal decisions require at least two evidence links'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER improvement_proposal_decision_requires_evidence
BEFORE INSERT ON improvement_proposal_decisions
FOR EACH ROW EXECUTE FUNCTION require_improvement_proposal_evidence();
