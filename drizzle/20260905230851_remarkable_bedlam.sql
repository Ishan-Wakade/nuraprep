CREATE TYPE "public"."score_evidence_level" AS ENUM('LOW', 'DEVELOPING', 'SUBSTANTIAL');--> statement-breakpoint
CREATE TYPE "public"."study_plan_item_status" AS ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');--> statement-breakpoint
CREATE TABLE "score_estimates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid NOT NULL,
	"model_version" varchar(80) NOT NULL,
	"estimate_basis_points" integer NOT NULL,
	"lower_basis_points" integer NOT NULL,
	"upper_basis_points" integer NOT NULL,
	"evidence_level" "score_evidence_level" NOT NULL,
	"evidence_count" integer NOT NULL,
	"effective_evidence_milli" integer NOT NULL,
	"feature_snapshot" jsonb NOT NULL,
	"caveats" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "score_estimate_range_check" CHECK ("score_estimates"."lower_basis_points" BETWEEN 0 AND 10000 AND "score_estimates"."estimate_basis_points" BETWEEN "score_estimates"."lower_basis_points" AND "score_estimates"."upper_basis_points" AND "score_estimates"."upper_basis_points" BETWEEN 0 AND 10000),
	CONSTRAINT "score_estimate_evidence_check" CHECK ("score_estimates"."evidence_count" >= 0 AND "score_estimates"."effective_evidence_milli" >= 0)
);
--> statement-breakpoint
CREATE TABLE "study_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_plan_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"priority" integer NOT NULL,
	"status" "study_plan_item_status" DEFAULT 'PLANNED' NOT NULL,
	"target_minutes" integer NOT NULL,
	"rationale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_plan_item_priority_check" CHECK ("study_plan_items"."priority" > 0),
	CONSTRAINT "study_plan_item_minutes_check" CHECK ("study_plan_items"."target_minutes" BETWEEN 10 AND 600),
	CONSTRAINT "study_plan_item_rationale_check" CHECK (length("study_plan_items"."rationale") >= 10)
);
--> statement-breakpoint
CREATE TABLE "study_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid NOT NULL,
	"score_estimate_id" uuid NOT NULL,
	"model_version" varchar(80) NOT NULL,
	"weekly_minutes" integer DEFAULT 180 NOT NULL,
	"learner_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_plan_weekly_minutes_check" CHECK ("study_plans"."weekly_minutes" BETWEEN 30 AND 1200)
);
--> statement-breakpoint
ALTER TABLE "score_estimates" ADD CONSTRAINT "score_estimates_learner_id_learner_profiles_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learner_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plan_items" ADD CONSTRAINT "study_plan_items_study_plan_id_study_plans_id_fk" FOREIGN KEY ("study_plan_id") REFERENCES "public"."study_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plan_items" ADD CONSTRAINT "study_plan_items_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_learner_id_learner_profiles_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learner_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_score_estimate_id_score_estimates_id_fk" FOREIGN KEY ("score_estimate_id") REFERENCES "public"."score_estimates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "score_estimate_learner_created_idx" ON "score_estimates" USING btree ("learner_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "study_plan_item_priority_idx" ON "study_plan_items" USING btree ("study_plan_id","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "study_plan_item_skill_idx" ON "study_plan_items" USING btree ("study_plan_id","skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "study_plan_estimate_idx" ON "study_plans" USING btree ("score_estimate_id");--> statement-breakpoint
CREATE INDEX "study_plan_learner_created_idx" ON "study_plans" USING btree ("learner_id","created_at");
--> statement-breakpoint
CREATE TRIGGER score_estimates_are_append_only
BEFORE UPDATE OR DELETE ON score_estimates
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();
